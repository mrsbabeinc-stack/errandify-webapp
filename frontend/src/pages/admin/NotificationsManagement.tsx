import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useToast, ToastContainer } from '../../components/Toast';
import AdminLayout from '../../components/admin/AdminLayout';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

type Channel = 'push' | 'inapp' | 'email' | 'sms';

interface NotificationGroup {
  id: number;
  name: string;
  description: string;
  /** The rule that decides membership — resolved server-side on every read. */
  segment: string;
  segmentLabel?: string;
  channels: Channel[];
  userCount: number;
  createdAt: string;
}

interface Notification {
  id: number;
  title: string;
  message: string;
  type: 'announcement' | 'alert' | 'reminder' | 'promotion';
  groupId: number | null;
  groupName?: string | null;
  segment: string;
  channels: Channel[];
  status: 'draft' | 'scheduled' | 'sent' | 'error';
  scheduledTime?: string;
  sentCount: number;
  errorCount: number;
  createdAt: string;
  sentAt?: string;
  errorLog?: string | null;
}

const SEGMENT_OPTIONS = [
  { key: 'all-users', label: 'Every active account' },
  { key: 'doers', label: 'Anyone whose offer has been accepted' },
  { key: 'askers', label: 'Anyone who has posted an errand' },
  { key: 'new-users', label: 'Joined in the last 30 days' },
  { key: 'vip', label: '1,000+ Errandify Points' },
];

export default function NotificationsManagement() {
  const navigate = useNavigate();
  const { toasts, showToast, removeToast } = useToast();

  // State - Notifications
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [newTitle, setNewTitle] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [newType, setNewType] = useState<'announcement' | 'alert' | 'reminder' | 'promotion'>('announcement');
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [selectedChannels, setSelectedChannels] = useState<Channel[]>(['push', 'inapp']);
  const [scheduledTime, setScheduledTime] = useState('');
  const [aiSuggestion, setAiSuggestion] = useState('');

  // State - Groups
  const [groups, setGroups] = useState<NotificationGroup[]>([]);
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [newGroupSegment, setNewGroupSegment] = useState('all-users');
  const [editingGroup, setEditingGroup] = useState<NotificationGroup | null>(null);

  // State - Search/Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'draft' | 'scheduled' | 'sent' | 'error'>('all');
  const [filterType, setFilterType] = useState<'all' | 'announcement' | 'alert' | 'reminder' | 'promotion'>('all');

  // State - UI
  const [selectedNotif, setSelectedNotif] = useState<Notification | null>(null);
  const [loadingId, setLoadingId] = useState<string | number | null>(null);
  const [activeTab, setActiveTab] = useState<'create' | 'groups'>('create');

  /**
   * Broadcasts and groups used to live in localStorage. A notification "sent"
   * there flipped a status field and picked its own delivery count out of
   * Math.random() — no user ever received one. Groups were worse: their sizes
   * were invented on first load and a new group was given a random count
   * between 100 and 5,100.
   */
  const authHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('token')}`,
  });

  const loadGroups = async () => {
    try {
      const res = await fetch(`${API_URL}/api/marcom/groups`, { headers: authHeaders() });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setGroups(json.data || []);
    } catch (err) {
      console.error('Could not load groups:', err);
      showToast('Could not load audience groups', 'error');
    }
  };

  const loadNotifications = async () => {
    try {
      const res = await fetch(`${API_URL}/api/marcom/broadcasts`, { headers: authHeaders() });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setNotifications(json.data || []);
    } catch (err) {
      console.error('Could not load notifications:', err);
      showToast('Could not load notifications', 'error');
    }
  };

  useEffect(() => {
    loadGroups();
    loadNotifications();
  }, []);

  // AI suggestion for message based on title
  const generateAiSuggestion = async () => {
    if (!newTitle.trim()) {
      showToast('Enter a title first', 'warning');
      return;
    }

    setLoadingId('ai-generate');
    try {
      // Mock AI suggestion - in real app, call backend with Claude/Qwen
      const suggestions: Record<string, string> = {
        'system maintenance': 'Our platform is undergoing scheduled maintenance to bring you better performance and features. We\'ll be back soon!',
        'new feature': 'Exciting news! We\'ve just launched something amazing. Check it out and let us know what you think!',
        'complete profile': 'Help us help you better. Complete your profile to get more personalized errand matches.',
        'earn bonus': 'Limited time offer! Earn extra bonus points on your next 5 errands. The clock is ticking!',
        'thank you': 'Thanks for being amazing! Your efforts make Errandify a better place for everyone.',
      };

      const key = Object.keys(suggestions).find(k => newTitle.toLowerCase().includes(k));
      const suggestion = key ? suggestions[key] : `Great! This notification will help ${newType === 'announcement' ? 'inform' : 'engage'} our community about "${newTitle}".`;

      setAiSuggestion(suggestion);
      showToast('✨ AI suggestion generated!', 'success');
    } catch (error) {
      showToast('Failed to generate suggestion', 'error');
    } finally {
      setLoadingId(null);
    }
  };

  const useAiSuggestion = () => {
    setNewMessage(aiSuggestion);
    setAiSuggestion('');
    showToast('Message updated with AI suggestion', 'success');
  };

  const handleCreateNotification = async () => {
    if (!newTitle.trim() || !newMessage.trim() || !selectedGroupId) {
      showToast('Fill all fields and select a group', 'warning');
      return;
    }
    setLoadingId('create-notif');
    try {
      const res = await fetch(`${API_URL}/api/marcom/broadcasts`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          title: newTitle,
          message: newMessage,
          type: newType,
          groupId: Number(selectedGroupId),
          channels: selectedChannels,
          scheduledTime: scheduledTime || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);

      await loadNotifications();
      showToast(scheduledTime ? '📅 Notification scheduled' : '✓ Saved as draft — press Send when ready', 'success');

      const a = json.audience;
      if (a && a.reachable < a.audience) {
        showToast(
          `${a.audience - a.reachable} of ${a.audience} excluded: a promotion goes only to people who opted in`,
          'warning'
        );
      }

      setNewTitle('');
      setNewMessage('');
      setAiSuggestion('');
      setScheduledTime('');
      setSelectedChannels(['push', 'inapp']);
    } catch (error: any) {
      showToast(error.message || 'Failed to create notification', 'error');
    } finally {
      setLoadingId(null);
    }
  };

  /**
   * Sends for real: in-app rows and push for everyone in the audience, email
   * where the channel was ticked. There is no undo, hence the confirmation.
   */
  const handleSendNotification = async (notifId: number) => {
    const notif = notifications.find((n) => n.id === notifId);
    const group = groups.find((g) => g.id === notif?.groupId);
    const to = group ? `${group.name} (${group.userCount} people)` : 'this audience';
    if (!window.confirm(`Send "${notif?.title}" to ${to}? This cannot be undone.`)) return;

    setLoadingId(notifId);
    try {
      const res = await fetch(`${API_URL}/api/marcom/broadcasts/${notifId}/send`, {
        method: 'POST',
        headers: authHeaders(),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);

      await loadNotifications();
      const d = json.data;
      showToast(`✓ Reached ${d.sent} of ${d.attempted}${d.failed ? `, ${d.failed} failed` : ''}`, d.failed ? 'warning' : 'success');
      (d.skipped || []).forEach((s: string) => showToast(s, 'warning'));
      if (json.deliveryMode === 'logged-only' && notif?.channels?.includes('email')) {
        showToast('No email provider configured — email was logged, not delivered', 'warning');
      }
    } catch (error: any) {
      showToast(error.message || 'Failed to send notification', 'error');
    } finally {
      setLoadingId(null);
    }
  };

  const handleDeleteNotification = async (notifId: number) => {
    if (!window.confirm('Delete this notification?')) return;
    setLoadingId(notifId);
    try {
      const res = await fetch(`${API_URL}/api/marcom/broadcasts/${notifId}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      await loadNotifications();
      showToast('✓ Deleted', 'success');
    } catch (error: any) {
      showToast(error.message || 'Failed to delete', 'error');
    } finally {
      setLoadingId(null);
    }
  };

  // Group management. A group is a named audience *rule*, so what is saved is
  // the rule — the size is counted from the users table on every read.
  const handleSaveGroup = async () => {
    if (!newGroupName.trim()) {
      showToast('Enter group name', 'warning');
      return;
    }
    try {
      const body = JSON.stringify({
        name: newGroupName,
        description: newGroupDesc,
        segment: newGroupSegment,
      });
      const res = editingGroup
        ? await fetch(`${API_URL}/api/marcom/groups/${editingGroup.id}`, {
            method: 'PATCH', headers: authHeaders(), body,
          })
        : await fetch(`${API_URL}/api/marcom/groups`, {
            method: 'POST', headers: authHeaders(), body,
          });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);

      await loadGroups();
      showToast(editingGroup ? '✓ Group updated' : '✓ Group created', 'success');
      setNewGroupName('');
      setNewGroupDesc('');
      setNewGroupSegment('all-users');
      setEditingGroup(null);
      setShowGroupForm(false);
    } catch (error: any) {
      showToast(error.message || 'Failed to save group', 'error');
    }
  };

  const handleEditGroup = (group: NotificationGroup) => {
    setEditingGroup(group);
    setNewGroupName(group.name);
    setNewGroupDesc(group.description || '');
    setNewGroupSegment(group.segment || 'all-users');
    setShowGroupForm(true);
  };

  const handleDeleteGroup = async (groupId: number) => {
    if (!window.confirm('Delete this group? Notifications already sent to it are unaffected.')) return;
    try {
      const res = await fetch(`${API_URL}/api/marcom/groups/${groupId}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      await loadGroups();
      showToast('✓ Group deleted', 'success');
    } catch (error: any) {
      showToast(error.message || 'Failed to delete group', 'error');
    }
  };

  // Filters
  const filtered = notifications.filter(n => {
    const matchesSearch = n.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      n.message.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || n.status === filterStatus;
    const matchesType = filterType === 'all' || n.type === filterType;
    return matchesSearch && matchesStatus && matchesType;
  });

  const typeColors = {
    'announcement': '#F0A81E',
    'alert': '#F44336',
    'reminder': '#FF9800',
    'promotion': '#4CAF50',
  };

  const statusIcons = {
    'draft': '📝',
    'scheduled': '📅',
    'sent': '✓',
    'error': '⚠️',
  };

  return (
    <AdminLayout>
      <div style={{ padding: '16px', background: '#fff', minHeight: '100vh' }}>
      <ToastContainer toasts={toasts} onClose={removeToast} />

      {/* Header */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#333' }}>
            📢 Notifications Management
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
          Send push notifications, in-app messages, emails & SMS to targeted user groups
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '2px solid #FFD9B3', paddingBottom: '8px' }}>
        {(['create', 'groups'] as const).map(tabName => (
          <button
            key={tabName}
            onClick={() => {
              setActiveTab(tabName);
              if (tabName === 'groups') setShowGroupForm(true);
            }}
            style={{
              padding: '8px 16px',
              background: activeTab === tabName ? '#FFD9B3' : 'transparent',
              color: activeTab === tabName ? '#333' : '#666',
              border: 'none',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              borderBottom: activeTab === tabName ? '3px solid #FF6B35' : '2px solid transparent',
              transition: 'all 0.2s',
            }}
          >
            {tabName === 'create' ? '📨 Create & Send' : '👥 Manage Groups'}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '24px' }}>
        {/* Main area */}
        <div>
          {activeTab === 'create' && (
            <>
            {/* Create Form */}
          <div style={{
            padding: '16px',
            background: 'linear-gradient(135deg, #FFF8F5 0%, #FFE4C4 100%)',
            borderRadius: '8px',
            marginBottom: '24px',
            border: '2px solid #FFD9B3',
          }}>
            <div style={{ fontSize: '14px', fontWeight: '600', color: '#333', marginBottom: '12px' }}>
              ✍️ Create Notification
            </div>

            <div style={{ display: 'grid', gap: '12px' }}>
              {/* Title Input */}
              <div>
                <input
                  type="text"
                  placeholder="Notification title..."
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '2px solid #FFD9B3',
                    borderRadius: '6px',
                    fontSize: '14px',
                  }}
                />
              </div>

              {/* AI Suggestion */}
              {!aiSuggestion ? (
                <button
                  onClick={generateAiSuggestion}
                  disabled={!newTitle.trim() || loadingId === 'ai-generate'}
                  style={{
                    padding: '8px 12px',
                    background: '#f0f0f0',
                    color: '#FF6B35',
                    border: '1px solid #FFD9B3',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: loadingId === 'ai-generate' ? 'wait' : 'pointer',
                    opacity: !newTitle.trim() ? 0.5 : 1,
                  }}
                >
                  {loadingId === 'ai-generate' ? '⏳ Generating...' : '✨ AI Suggest Text'}
                </button>
              ) : (
                <div style={{
                  padding: '12px',
                  background: '#e8f5e9',
                  border: '1px solid #4CAF50',
                  borderRadius: '6px',
                  fontSize: '12px',
                  color: '#2e7d32',
                }}>
                  <div style={{ fontWeight: '600', marginBottom: '6px' }}>💡 Suggestion:</div>
                  <div style={{ marginBottom: '8px' }}>{aiSuggestion}</div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      onClick={useAiSuggestion}
                      style={{
                        flex: 1,
                        padding: '6px',
                        background: '#4CAF50',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: '600',
                        cursor: 'pointer',
                      }}
                    >
                      Use
                    </button>
                    <button
                      onClick={() => setAiSuggestion('')}
                      style={{
                        flex: 1,
                        padding: '6px',
                        background: 'white',
                        color: '#2e7d32',
                        border: '1px solid #4CAF50',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: '600',
                        cursor: 'pointer',
                      }}
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              )}

              {/* Message Input */}
              <textarea
                placeholder="Notification message (in Errandify tone)..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '2px solid #FFD9B3',
                  borderRadius: '6px',
                  fontSize: '14px',
                  minHeight: '80px',
                  fontFamily: 'system-ui',
                  resize: 'vertical',
                }}
              />

              {/* Type */}
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value as any)}
                style={{
                  padding: '10px 12px',
                  border: '2px solid #FFD9B3',
                  borderRadius: '6px',
                  fontSize: '14px',
                  cursor: 'pointer',
                }}
              >
                <option value="announcement">📢 Announcement</option>
                <option value="alert">🚨 Alert</option>
                <option value="reminder">⏰ Reminder</option>
                <option value="promotion">🎁 Promotion</option>
              </select>

              {/* Group Selection */}
              <select
                value={selectedGroupId}
                onChange={(e) => setSelectedGroupId(e.target.value)}
                style={{
                  padding: '10px 12px',
                  border: '2px solid #FFD9B3',
                  borderRadius: '6px',
                  fontSize: '14px',
                  cursor: 'pointer',
                }}
              >
                <option value="">Select target group...</option>
                {groups.map(g => (
                  <option key={g.id} value={g.id}>
                    👥 {g.name} ({g.userCount.toLocaleString()} users)
                  </option>
                ))}
              </select>

              {/* Channels */}
              <div style={{ padding: '10px 12px', background: 'white', borderRadius: '6px', border: '2px solid #FFD9B3' }}>
                <div style={{ fontSize: '12px', fontWeight: '600', marginBottom: '8px' }}>Delivery channels:</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
                  {(['push', 'inapp', 'email', 'sms'] as const).map(ch => (
                    <label key={ch} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '12px' }}>
                      <input
                        type="checkbox"
                        checked={selectedChannels.includes(ch)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedChannels([...selectedChannels, ch]);
                          } else {
                            setSelectedChannels(selectedChannels.filter(c => c !== ch));
                          }
                        }}
                      />
                      {ch === 'push' && '📱 Push'}
                      {ch === 'inapp' && '💬 In-App'}
                      {ch === 'email' && '📧 Email'}
                      {ch === 'sms' && '📲 SMS'}
                    </label>
                  ))}
                </div>
              </div>

              {/* Schedule */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#333', display: 'block', marginBottom: '6px' }}>
                  📅 Schedule (optional)
                </label>
                <input
                  type="datetime-local"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '2px solid #FFD9B3',
                    borderRadius: '6px',
                    fontSize: '14px',
                  }}
                />
              </div>

              {/* Send Button */}
              <button
                onClick={handleCreateNotification}
                disabled={loadingId === 'create-notif'}
                style={{
                  padding: '10px',
                  background: loadingId === 'create-notif' ? '#ccc' : 'linear-gradient(135deg, #FF6B35 0%, #FF8C5A 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: '600',
                  cursor: loadingId === 'create-notif' ? 'wait' : 'pointer',
                  fontSize: '14px',
                }}
              >
                {loadingId === 'create-notif' ? '⏳ Creating...' : '📨 ' + (scheduledTime ? 'Schedule' : 'Send Now')}
              </button>
            </div>
          </div>
          </>
          )}

          {activeTab === 'groups' && (
            <>
              {/* Groups Management */}
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#333', marginBottom: '16px' }}>
                  👥 Notification Groups
                </h3>
                <div style={{ display: 'grid', gap: '12px' }}>
                  {groups.map(group => (
                    <div key={group.id} style={{
                      padding: '16px',
                      background: 'white',
                      border: '2px solid #FFD9B3',
                      borderRadius: '8px',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                        <div>
                          <div style={{ fontWeight: '600', color: '#333', marginBottom: '4px' }}>
                            {group.name}
                          </div>
                          <div style={{ fontSize: '12px', color: '#666', marginBottom: '6px' }}>
                            {group.description}
                          </div>
                        </div>
                        <div style={{ fontSize: '13px', fontWeight: '700', color: '#FF6B35' }}>
                          {group.userCount.toLocaleString()} users
                        </div>
                      </div>
                      <div style={{ fontSize: '11px', color: '#999', marginBottom: '8px' }}>
                        Rule: {group.segmentLabel || group.segment} • Channels:{' '}
                        {(group.channels || []).join(', ').toUpperCase()}
                      </div>
                      {/* These two buttons had no onClick at all. */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        <button
                          onClick={() => handleEditGroup(group)}
                          style={{
                            padding: '6px 12px',
                            background: '#F0A81E',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontWeight: '600',
                            cursor: 'pointer',
                          }}
                        >
                          ✏️ Edit
                        </button>
                        <button
                          onClick={() => handleDeleteGroup(group.id)}
                          style={{
                            padding: '6px 12px',
                            background: '#F44336',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontWeight: '600',
                            cursor: 'pointer',
                          }}
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Search & Filter for Notifications */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '24px', marginTop: '24px' }}>
                <input
                  type="text"
                  placeholder="Search notifications..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    border: '2px solid #FFD9B3',
                    borderRadius: '6px',
                    fontSize: '13px',
                  }}
                />
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as any)}
                  style={{
                    padding: '8px 12px',
                    border: '2px solid #FFD9B3',
                    borderRadius: '6px',
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  <option value="all">All Statuses</option>
                  <option value="draft">📝 Draft</option>
                  <option value="scheduled">📅 Scheduled</option>
                  <option value="sent">✓ Sent</option>
                  <option value="error">⚠️ Error</option>
                </select>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as any)}
                  style={{
                    padding: '8px 12px',
                    border: '2px solid #FFD9B3',
                    borderRadius: '6px',
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  <option value="all">All Types</option>
                  <option value="announcement">📢 Announcement</option>
                  <option value="alert">🚨 Alert</option>
                  <option value="reminder">⏰ Reminder</option>
                  <option value="promotion">🎁 Promotion</option>
                </select>
              </div>

              {/* Notifications List */}
              <div style={{
                maxHeight: '600px',
                overflowY: 'auto',
                display: 'grid',
                gap: '12px',
              }}>
              {filtered.length === 0 ? (
                <div style={{
                  padding: '32px',
                  textAlign: 'center',
                  color: '#999',
                }}>
                  No notifications found
                </div>
              ) : (
                filtered.map(notif => {
                  const group = groups.find(g => g.id === notif.groupId);
                  return (
                    <div
                      key={notif.id}
                      onClick={() => setSelectedNotif(notif)}
                    style={{
                      padding: '16px',
                      background: selectedNotif?.id === notif.id ? '#FFF8F5' : 'white',
                      border: `2px solid ${selectedNotif?.id === notif.id ? '#FF6B35' : typeColors[notif.type]}`,
                      borderRadius: '8px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                      <div>
                        <div style={{ fontWeight: '600', color: '#333', fontSize: '14px' }}>
                          {notif.title}
                        </div>
                        <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                          {notif.message.substring(0, 80)}...
                        </div>
                      </div>
                      <span style={{
                        padding: '4px 8px',
                        background: typeColors[notif.type],
                        color: 'white',
                        borderRadius: '4px',
                        fontSize: '10px',
                        fontWeight: '600',
                        whiteSpace: 'nowrap',
                      }}>
                        {notif.type.toUpperCase()}
                      </span>
                    </div>

                    <div style={{ fontSize: '11px', color: '#999', marginBottom: '8px' }}>
                      {statusIcons[notif.status]} {notif.status.toUpperCase()} •{' '}
                      {notif.groupName || group?.name || 'Audience removed'} •{' '}
                      {(notif.channels || []).join(', ').toUpperCase()}
                    </div>
                    {notif.errorLog && (
                      <pre style={{ fontSize: '10px', color: '#C1440E', background: '#FFF3F0', padding: '6px', borderRadius: '4px', marginBottom: '8px', whiteSpace: 'pre-wrap' }}>
                        {notif.errorLog}
                      </pre>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: '11px', color: '#666' }}>
                        {notif.status === 'sent' && (
                          <>
                            ✓ Sent: {notif.sentCount.toLocaleString()}
                            {notif.errorCount > 0 && ` • ⚠️ Errors: ${notif.errorCount}`}
                          </>
                        )}
                        {notif.status === 'error' && (
                          <>
                            ⚠️ Failed to send {notif.errorCount} / {notif.sentCount}
                          </>
                        )}
                        {notif.status === 'scheduled' && (
                          <>
                            📅 {new Date(notif.scheduledTime || '').toLocaleString()}
                          </>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        {notif.status !== 'sent' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSendNotification(notif.id);
                            }}
                            disabled={loadingId === notif.id}
                            style={{
                              padding: '4px 12px',
                              background: loadingId === notif.id ? '#ccc' : '#FF6B35',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: '600',
                              cursor: loadingId === notif.id ? 'wait' : 'pointer',
                            }}
                          >
                            {loadingId === notif.id ? 'Sending...' : 'Send'}
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteNotification(notif.id);
                          }}
                          style={{
                            padding: '4px 12px',
                            background: '#F44336',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: '600',
                            cursor: 'pointer',
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
              )}
              </div>
            </>
          )}
        </div>

        {/* Right Sidebar - Group Management */}
        <div style={{
          background: 'linear-gradient(135deg, #FFF8F5 0%, #FFE4C4 100%)',
          border: '2px solid #FFD9B3',
          borderRadius: '8px',
          padding: '16px',
          height: 'fit-content',
          maxHeight: '700px',
          overflowY: 'auto',
        }}>
          {showGroupForm ? (
            <>
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#333', marginBottom: '12px' }}>
                {editingGroup ? '✏️ Edit Group' : '➕ New Group'}
              </div>
              <div style={{ display: 'grid', gap: '12px' }}>
                <input
                  type="text"
                  placeholder="Group name"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    border: '2px solid #FFD9B3',
                    borderRadius: '6px',
                    fontSize: '13px',
                  }}
                />
                <textarea
                  placeholder="Description"
                  value={newGroupDesc}
                  onChange={(e) => setNewGroupDesc(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    border: '2px solid #FFD9B3',
                    borderRadius: '6px',
                    fontSize: '13px',
                    minHeight: '60px',
                    resize: 'vertical',
                  }}
                />
                {/*
                  A group is a name for one of these rules. Without this the
                  screen could name an audience but not say who is in it, which
                  is how the old version ended up inventing member counts.
                */}
                <label style={{ fontSize: '11px', fontWeight: '600', color: '#333' }}>
                  Who is in this group?
                </label>
                <select
                  value={newGroupSegment}
                  onChange={(e) => setNewGroupSegment(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    border: '2px solid #FFD9B3',
                    borderRadius: '6px',
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  {SEGMENT_OPTIONS.map((s) => (
                    <option key={s.key} value={s.key}>{s.label}</option>
                  ))}
                </select>
                <button
                  onClick={handleSaveGroup}
                  style={{
                    padding: '8px',
                    background: 'linear-gradient(135deg, #FF6B35 0%, #FF8C5A 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    fontSize: '12px',
                  }}
                >
                  💾 Save
                </button>
                <button
                  onClick={() => {
                    setShowGroupForm(false);
                    setNewGroupName('');
                    setNewGroupDesc('');
                    setEditingGroup(null);
                  }}
                  style={{
                    padding: '8px',
                    background: '#f0f0f0',
                    color: '#333',
                    border: 'none',
                    borderRadius: '6px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    fontSize: '12px',
                  }}
                >
                  Cancel
                </button>
              </div>
            </>
          ) : (
            <>
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#333', marginBottom: '12px' }}>
                👥 Groups ({groups.length})
              </div>
              <button
                onClick={() => setShowGroupForm(true)}
                style={{
                  width: '100%',
                  padding: '8px',
                  background: '#FF6B35',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  fontSize: '12px',
                  marginBottom: '12px',
                }}
              >
                ➕ New Group
              </button>
              <div style={{ display: 'grid', gap: '8px' }}>
                {groups.map(g => (
                  <div
                    key={g.id}
                    style={{
                      padding: '12px',
                      background: 'white',
                      border: '1px solid #FFD9B3',
                      borderRadius: '6px',
                    }}
                  >
                    <div style={{ fontWeight: '600', fontSize: '12px', color: '#333', marginBottom: '4px' }}>
                      {g.name}
                    </div>
                    <div style={{ fontSize: '11px', color: '#666', marginBottom: '6px' }}>
                      {g.description}
                    </div>
                    <div style={{ fontSize: '11px', color: '#FF6B35', fontWeight: '600', marginBottom: '6px' }}>
                      👥 {g.userCount.toLocaleString()} users
                    </div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        onClick={() => {
                          setEditingGroup(g);
                          setNewGroupName(g.name);
                          setNewGroupDesc(g.description);
                          setShowGroupForm(true);
                        }}
                        style={{
                          flex: 1,
                          padding: '4px 6px',
                          background: '#f0f0f0',
                          color: '#333',
                          border: 'none',
                          borderRadius: '4px',
                          fontSize: '10px',
                          fontWeight: '600',
                          cursor: 'pointer',
                        }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteGroup(g.id)}
                        style={{
                          flex: 1,
                          padding: '4px 6px',
                          background: '#ffebee',
                          color: '#c62828',
                          border: 'none',
                          borderRadius: '4px',
                          fontSize: '10px',
                          fontWeight: '600',
                          cursor: 'pointer',
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Detail Panel */}
      {selectedNotif && (
        <div style={{
          marginTop: '24px',
          padding: '16px',
          background: '#FFF8F5',
          border: '2px solid #FF6B35',
          borderRadius: '8px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#333' }}>📌 Details</h3>
            <button
              onClick={() => setSelectedNotif(null)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '16px',
                color: '#FF6B35',
              }}
            >
              ✕
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', fontSize: '12px' }}>
            <div>
              <div style={{ fontWeight: '600', color: '#666', marginBottom: '4px' }}>Created</div>
              <div>{new Date(selectedNotif.createdAt).toLocaleString()}</div>
            </div>
            <div>
              <div style={{ fontWeight: '600', color: '#666', marginBottom: '4px' }}>Target Group</div>
              <div>{groups.find(g => g.id === selectedNotif.groupId)?.name}</div>
            </div>
            <div>
              <div style={{ fontWeight: '600', color: '#666', marginBottom: '4px' }}>Channels</div>
              <div>{selectedNotif.channels.join(', ').toUpperCase()}</div>
            </div>
            <div>
              <div style={{ fontWeight: '600', color: '#666', marginBottom: '4px' }}>Status</div>
              <div>{statusIcons[selectedNotif.status]} {selectedNotif.status.toUpperCase()}</div>
            </div>
            {selectedNotif.errorLog && (
              <div style={{ gridColumn: '1/-1' }}>
                <div style={{ fontWeight: '600', color: '#c62828', marginBottom: '4px' }}>⚠️ Error Log</div>
                <div style={{ color: '#c62828', whiteSpace: 'pre-wrap', fontSize: '11px' }}>
                  {selectedNotif.errorLog}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Info Box */}
      <div style={{
        marginTop: '24px',
        padding: '12px 16px',
        background: '#FFF3E4',
        border: '2px solid #F0A81E',
        borderRadius: '8px',
        fontSize: '12px',
        color: '#D98C0C',
      }}>
        <strong>ℹ️ What's what:</strong>
        <ul style={{ marginTop: '6px', paddingLeft: '18px' }}>
          <li><strong>Push:</strong> Browser notifications (mobile & desktop)</li>
          <li><strong>In-App:</strong> Messages within Errandify app</li>
          <li><strong>Email:</strong> Sent to registered email address</li>
          <li><strong>SMS:</strong> Text message to phone number</li>
          <li><strong>Draft:</strong> Ready to send, not yet dispatched</li>
          <li><strong>Scheduled:</strong> Will send at specified time automatically</li>
          <li><strong>Error:</strong> Some users failed to receive (see error log)</li>
        </ul>
      </div>
      </div>
    </AdminLayout>
  );
}
