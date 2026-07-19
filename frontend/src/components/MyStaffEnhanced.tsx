import React, { useState, useEffect } from 'react';

interface StaffMember {
  id: number;
  user_id: number;
  display_name: string;
  email: string;
  role: string;
  status: string;
  assigned_at: string;
  task_count: number;
  errandify_points: number;
  // MOM Requirements from SingPass
  is_vulnerable_person?: boolean;
  vulnerability_type?: string; // elderly, migrant, mental_health, trafficking
  restrictions?: string[]; // Cannot do errands with certain restrictions
  singpass_verified?: boolean;
  verified_date?: string;
}

interface MyStaffEnhancedProps {
  companyId: number;
}

const MyStaffEnhanced: React.FC<MyStaffEnhancedProps> = ({ companyId }) => {
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMember, setSelectedMember] = useState<StaffMember | null>(null);

  useEffect(() => {
    fetchStaffMembers();
  }, [companyId]);

  const fetchStaffMembers = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(
        `/api/staff/members?company_id=${companyId}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      const data = await res.json();
      if (data.success) {
        setStaffMembers(data.data);
      }
    } catch (error) {
      console.error('Error fetching staff:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveStaff = async (userId: number) => {
    if (!window.confirm('Remove this staff member? (User account will remain active)')) return;

    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/staff/remove', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ company_id: companyId, user_id: userId })
      });

      const data = await res.json();
      if (data.success) {
        setStaffMembers(staffMembers.filter(m => m.user_id !== userId));
      }
    } catch (error) {
      console.error('Error removing staff:', error);
    }
  };

  const getVulnerabilityBadge = (member: StaffMember) => {
    if (!member.is_vulnerable_person) return null;

    const badges: { [key: string]: { label: string; color: string } } = {
      elderly: { label: '👴 Elderly', color: '#FF9800' },
      migrant: { label: '🌍 Migrant', color: '#2196F3' },
      mental_health: { label: '🧠 Mental Health', color: '#9C27B0' },
      trafficking: { label: '⚠️ At Risk', color: '#F44336' }
    };

    const badge = badges[member.vulnerability_type || ''] || { label: 'Protected', color: '#4CAF50' };
    return (
      <span style={{
        background: badge.color,
        color: 'white',
        padding: '4px 12px',
        borderRadius: '16px',
        fontSize: '12px',
        fontWeight: '600'
      }}>
        {badge.label}
      </span>
    );
  };

  const getRestrictionsList = (member: StaffMember) => {
    if (!member.restrictions || member.restrictions.length === 0) return null;

    return (
      <div style={{ marginTop: '8px', padding: '8px', background: '#FFF3E0', borderRadius: '8px', fontSize: '12px' }}>
        <strong>⚠️ Errand Restrictions:</strong>
        <ul style={{ margin: '4px 0 0 16px', paddingLeft: '0' }}>
          {member.restrictions.map((r, i) => (
            <li key={i}>{r}</li>
          ))}
        </ul>
      </div>
    );
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '20px' }}>Loading staff...</div>;
  }

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>👥 My Staff ({staffMembers.length})</h2>
        <button
          onClick={() => setShowInviteModal(true)}
          style={{
            background: '#FF6B35',
            color: 'white',
            border: 'none',
            padding: '12px 20px',
            borderRadius: '8px',
            fontWeight: '700',
            cursor: 'pointer'
          }}
        >
          + Invite Staff
        </button>
      </div>

      <div style={{ display: 'grid', gap: '16px' }}>
        {staffMembers.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '40px 20px',
            background: '#F5F5F5',
            borderRadius: '12px',
            color: '#666'
          }}>
            <p>No staff members yet. Click "Invite Staff" to add team members.</p>
          </div>
        ) : (
          staffMembers.map((member) => (
            <div
              key={member.user_id}
              style={{
                background: 'white',
                border: '2px solid #E8D5C4',
                borderRadius: '12px',
                padding: '16px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
              }}
            >
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <div style={{ flex: 1 }}>
                  <h4 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: '700', color: '#333' }}>
                    {member.display_name}
                  </h4>
                  <p style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#666' }}>
                    {member.email}
                  </p>

                  {/* Badges */}
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
                    <span style={{
                      background: '#FFF3E0',
                      color: '#FF6B35',
                      padding: '4px 10px',
                      borderRadius: '12px',
                      fontSize: '11px',
                      fontWeight: '600'
                    }}>
                      {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                    </span>
                    {member.singpass_verified && (
                      <span style={{
                        background: '#E8F5E9',
                        color: '#2E7D32',
                        padding: '4px 10px',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: '600'
                      }}>
                        ✅ SingPass Verified
                      </span>
                    )}
                    {getVulnerabilityBadge(member)}
                  </div>
                </div>

                <button
                  onClick={() => handleRemoveStaff(member.user_id)}
                  style={{
                    background: '#F5F5F5',
                    color: '#E74C3C',
                    border: '1px solid #DDD',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Remove
                </button>
              </div>

              {/* Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div style={{ background: '#F5F5F5', padding: '10px', borderRadius: '8px', fontSize: '13px' }}>
                  <span style={{ color: '#666' }}>Tasks Completed:</span>
                  <strong style={{ color: '#FF6B35', marginLeft: '8px' }}>✅ {member.task_count}</strong>
                </div>
                <div style={{ background: '#F5F5F5', padding: '10px', borderRadius: '8px', fontSize: '13px' }}>
                  <span style={{ color: '#666' }}>EP Balance:</span>
                  <strong style={{ color: '#FF6B35', marginLeft: '8px' }}>{member.errandify_points}</strong>
                </div>
              </div>

              {/* MOM/Restrictions Info */}
              {member.is_vulnerable_person && (
                <div style={{
                  background: '#FFF3E0',
                  border: '1px solid #FFB84D',
                  borderRadius: '8px',
                  padding: '12px',
                  marginBottom: '12px'
                }}>
                  <p style={{ margin: '0 0 8px 0', fontSize: '12px', fontWeight: '700', color: '#333' }}>
                    🛡️ MOM Protected Person
                  </p>
                  <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#666' }}>
                    This staff member is classified as a vulnerable person and requires special workplace protections.
                  </p>
                  {getRestrictionsList(member)}
                </div>
              )}

              {/* Joined Info */}
              <p style={{ margin: '0', fontSize: '11px', color: '#999' }}>
                Joined: {new Date(member.assigned_at).toLocaleDateString()}
              </p>
            </div>
          ))
        )}
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '500px',
            width: '90%',
            maxHeight: '80vh',
            overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0 }}>💳 Invite Staff Member</h3>
              <button
                onClick={() => setShowInviteModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#999'
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '8px' }}>
                Search Individual
              </label>
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #DDD',
                  borderRadius: '8px',
                  fontSize: '13px',
                  boxSizing: 'border-box'
                }}
              />
              <p style={{ fontSize: '12px', color: '#666', margin: '8px 0 0 0' }}>
                Individual must have signed up and completed SingPass verification first.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setShowInviteModal(false)}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: '#F5F5F5',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                disabled={!searchQuery}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: searchQuery ? '#FF6B35' : '#CCC',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: '600',
                  cursor: searchQuery ? 'pointer' : 'not-allowed'
                }}
              >
                Search & Invite
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyStaffEnhanced;
