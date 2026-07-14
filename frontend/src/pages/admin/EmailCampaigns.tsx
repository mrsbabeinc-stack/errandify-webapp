import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/admin/AdminLayout';

interface Campaign {
  id: string;
  name: string;
  subject: string;
  recipientCount: number;
  status: 'draft' | 'scheduled' | 'sent' | 'failed';
  createdAt: string;
  sentAt?: string;
  openRate: number;
  clickRate: number;
}

export default function EmailCampaigns() {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [newCampaignName, setNewCampaignName] = useState('');
  const [newCampaignSubject, setNewCampaignSubject] = useState('');
  const [newCampaignRecipients, setNewCampaignRecipients] = useState('all-users');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editSubject, setEditSubject] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('emailCampaigns');
    if (saved) {
      setCampaigns(JSON.parse(saved));
    } else {
      const demoCampaigns: Campaign[] = [
        {
          id: 'c_1',
          name: 'Welcome New Users',
          subject: 'Welcome to Errandify! Get Started Today',
          recipientCount: 2345,
          status: 'sent',
          createdAt: new Date(Date.now() - 604800000).toISOString(),
          sentAt: new Date(Date.now() - 604800000).toISOString(),
          openRate: 42,
          clickRate: 18,
        },
        {
          id: 'c_2',
          name: 'Referral Program Launch',
          subject: 'Invite Friends and Earn Rewards!',
          recipientCount: 5234,
          status: 'sent',
          createdAt: new Date(Date.now() - 1296000000).toISOString(),
          sentAt: new Date(Date.now() - 1296000000).toISOString(),
          openRate: 35,
          clickRate: 12,
        },
        {
          id: 'c_3',
          name: 'Q3 Summer Promotion',
          subject: 'Limited Time: 20% Off First Order',
          recipientCount: 8901,
          status: 'scheduled',
          createdAt: new Date(Date.now() - 86400000).toISOString(),
          openRate: 0,
          clickRate: 0,
        },
      ];
      setCampaigns(demoCampaigns);
      localStorage.setItem('emailCampaigns', JSON.stringify(demoCampaigns));
    }
  }, []);

  const handleCreateCampaign = () => {
    if (!newCampaignName.trim() || !newCampaignSubject.trim()) {
      alert('Please fill in campaign name and subject');
      return;
    }

    const newCampaign: Campaign = {
      id: `c_${Date.now()}`,
      name: newCampaignName,
      subject: newCampaignSubject,
      recipientCount: newCampaignRecipients === 'all-users' ? 12450 : 5000,
      status: 'draft',
      createdAt: new Date().toISOString(),
      openRate: 0,
      clickRate: 0,
    };

    const updated = [...campaigns, newCampaign];
    setCampaigns(updated);
    localStorage.setItem('emailCampaigns', JSON.stringify(updated));
    setNewCampaignName('');
    setNewCampaignSubject('');
    alert('✅ Campaign created successfully!');
  };

  const handleEditCampaign = (campaign: Campaign) => {
    setEditingId(campaign.id);
    setEditName(campaign.name);
    setEditSubject(campaign.subject);
  };

  const handleSaveEdit = (campaignId: string) => {
    if (!editName.trim() || !editSubject.trim()) {
      alert('Please fill in name and subject');
      return;
    }

    const updated = campaigns.map(c =>
      c.id === campaignId
        ? { ...c, name: editName, subject: editSubject }
        : c
    );
    setCampaigns(updated);
    localStorage.setItem('emailCampaigns', JSON.stringify(updated));
    setEditingId(null);
    alert('✅ Campaign updated successfully!');
  };

  const handleDeleteCampaign = (campaignId: string) => {
    if (!window.confirm('Are you sure you want to delete this campaign?')) {
      return;
    }
    const updated = campaigns.filter(c => c.id !== campaignId);
    setCampaigns(updated);
    localStorage.setItem('emailCampaigns', JSON.stringify(updated));
    alert('✅ Campaign deleted!');
  };

  const statusColors = {
    'draft': '#2196F3',
    'scheduled': '#FF9800',
    'sent': '#4CAF50',
    'failed': '#F44336',
  };

  return (
    <AdminLayout>
      <div style={{ padding: '16px', background: '#fff' }}>
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#333' }}>
            📧 Email Campaigns
          </h2>
          <button
            onClick={() => navigate(-1)}
            style={{
              fontSize: '20px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#FF6B35',
              fontWeight: '700',
              padding: '0 8px',
            }}
            title="Go back"
          >
            ←
          </button>
        </div>
        <p style={{ fontSize: '14px', color: '#666' }}>
          Create and manage email marketing campaigns
        </p>
      </div>

      <div style={{ marginBottom: '24px' }}>
        <div style={{ fontSize: '14px', fontWeight: '600', color: '#333', marginBottom: '12px' }}>
          Create New Campaign
        </div>
        <div style={{ display: 'grid', gap: '12px' }}>
          <input
            type="text"
            placeholder="Campaign name"
            value={newCampaignName}
            onChange={(e) => setNewCampaignName(e.target.value)}
            style={{ padding: '10px 12px', border: '2px solid #FFD9B3', borderRadius: '6px', fontSize: '14px' }}
          />
          <input
            type="text"
            placeholder="Email subject line"
            value={newCampaignSubject}
            onChange={(e) => setNewCampaignSubject(e.target.value)}
            style={{ padding: '10px 12px', border: '2px solid #FFD9B3', borderRadius: '6px', fontSize: '14px' }}
          />
          <select
            value={newCampaignRecipients}
            onChange={(e) => setNewCampaignRecipients(e.target.value)}
            style={{ padding: '10px 12px', border: '2px solid #FFD9B3', borderRadius: '6px', fontSize: '14px', cursor: 'pointer' }}
          >
            <option value="all-users">All Users (12,450)</option>
            <option value="doers">Doers Only (5,234)</option>
            <option value="askers">Askers Only (7,216)</option>
          </select>
          <button
            onClick={handleCreateCampaign}
            style={{
              padding: '10px',
              background: 'linear-gradient(135deg, #FF6B35 0%, #FF8C5A 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            + Create Campaign
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gap: '12px' }}>
        {campaigns.map(campaign => (
          <div key={campaign.id} style={{
            padding: '16px',
            background: 'white',
            border: `2px solid ${statusColors[campaign.status]}`,
            borderRadius: '8px',
          }}>
            {editingId === campaign.id ? (
              // Edit Mode
              <div style={{ display: 'grid', gap: '12px' }}>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  style={{ padding: '10px 12px', border: '2px solid #FFD9B3', borderRadius: '6px', fontSize: '14px' }}
                  placeholder="Campaign name"
                />
                <input
                  type="text"
                  value={editSubject}
                  onChange={(e) => setEditSubject(e.target.value)}
                  style={{ padding: '10px 12px', border: '2px solid #FFD9B3', borderRadius: '6px', fontSize: '14px' }}
                  placeholder="Email subject"
                />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <button
                    onClick={() => handleSaveEdit(campaign.id)}
                    style={{
                      padding: '10px',
                      background: '#4CAF50',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      fontWeight: '600',
                      cursor: 'pointer',
                    }}
                  >
                    ✅ Save
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    style={{
                      padding: '10px',
                      background: '#f0f0f0',
                      color: '#333',
                      border: 'none',
                      borderRadius: '6px',
                      fontWeight: '600',
                      cursor: 'pointer',
                    }}
                  >
                    ❌ Cancel
                  </button>
                </div>
              </div>
            ) : (
              // Display Mode
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '12px', alignItems: 'start', marginBottom: '12px' }}>
                  <div>
                    <div style={{ fontWeight: '600', color: '#333', marginBottom: '4px' }}>
                      {campaign.name}
                    </div>
                    <div style={{ fontSize: '12px', color: '#666' }}>
                      "{campaign.subject}"
                    </div>
                  </div>
                  <span style={{
                    padding: '6px 10px',
                    background: statusColors[campaign.status],
                    color: 'white',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: '600',
                    height: 'fit-content',
                    whiteSpace: 'nowrap',
                  }}>
                    {campaign.status.toUpperCase()}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', fontSize: '12px', marginBottom: '12px' }}>
                  <div style={{ background: '#FFF8F5', padding: '8px', borderRadius: '4px' }}>
                    <div style={{ fontSize: '11px', color: '#999' }}>Recipients</div>
                    <div style={{ fontWeight: '700', color: '#FF6B35', fontSize: '16px' }}>
                      {campaign.recipientCount.toLocaleString()}
                    </div>
                  </div>
                  <div style={{ background: '#FFF8F5', padding: '8px', borderRadius: '4px' }}>
                    <div style={{ fontSize: '11px', color: '#999' }}>Open Rate</div>
                    <div style={{ fontWeight: '700', color: '#FF6B35', fontSize: '16px' }}>
                      {campaign.openRate}%
                    </div>
                  </div>
                  <div style={{ background: '#FFF8F5', padding: '8px', borderRadius: '4px' }}>
                    <div style={{ fontSize: '11px', color: '#999' }}>Click Rate</div>
                    <div style={{ fontWeight: '700', color: '#FF6B35', fontSize: '16px' }}>
                      {campaign.clickRate}%
                    </div>
                  </div>
                  <div style={{ background: '#FFF8F5', padding: '8px', borderRadius: '4px' }}>
                    <div style={{ fontSize: '11px', color: '#999' }}>Created</div>
                    <div style={{ fontWeight: '700', color: '#333', fontSize: '13px' }}>
                      {new Date(campaign.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <button
                    onClick={() => handleEditCampaign(campaign)}
                    style={{
                      padding: '8px',
                      background: '#2196F3',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      fontSize: '12px'
                    }}
                  >
                    ✏️ Edit
                  </button>
                  <button
                    onClick={() => handleDeleteCampaign(campaign.id)}
                    style={{
                      padding: '8px',
                      background: '#F44336',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      fontSize: '12px'
                    }}
                  >
                    🗑️ Delete
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
      </div>
    </AdminLayout>
  );
}
