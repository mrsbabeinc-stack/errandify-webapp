import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useToast, ToastContainer } from '../../components/Toast';
import AdminLayout from '../../components/admin/AdminLayout';
import { eventOptimizer, Event, EventSignup, EventEngagementFeature } from '../../utils/eventOptimizer';

export default function Events() {
  const navigate = useNavigate();
  const { toasts, showToast, removeToast } = useToast();
  const [activeTab, setActiveTab] = useState<'events' | 'create' | 'ai-assist'>('events');
  const [events, setEvents] = useState<Event[]>([]);

  // Create event form state
  const [newEventName, setNewEventName] = useState('');
  const [newEventType, setNewEventType] = useState<'online' | 'offline'>('online');
  const [newDescription, setNewDescription] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newStartDate, setNewStartDate] = useState('');
  const [newStartTime, setNewStartTime] = useState('09:00');
  const [newEndTime, setNewEndTime] = useState('11:00');
  const [newCutoffDate, setNewCutoffDate] = useState('');
  const [newCutoffTime, setNewCutoffTime] = useState('17:00');
  const [newCost, setNewCost] = useState('0');
  const [newMinPax, setNewMinPax] = useState('10');
  const [newMaxPax, setNewMaxPax] = useState('50');
  const [eventImageUrl, setEventImageUrl] = useState('');
  const [eventImageAlt, setEventImageAlt] = useState('');

  // AI assist state
  const [aiTopic, setAiTopic] = useState('');
  const [aiAudience, setAiAudience] = useState('');
  const [aiDescLoading, setAiDescLoading] = useState(false);
  const [aiEngagementLoading, setAiEngagementLoading] = useState(false);
  const [suggestedFeatures, setSuggestedFeatures] = useState<EventEngagementFeature[]>([]);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  // Events used to live in localStorage, so an event created here was saved to
  // this browser alone — MyKampung could never show it and it was lost with the
  // cache. Both ends now read and write community_events.
  const loadEvents = async () => {
    try {
      const res = await fetch(`${API_URL}/api/events/all`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (!res.ok) throw new Error('request failed');
      const result = await res.json();
      setEvents(
        (result.data || []).map((e: any) => ({
          id: String(e.id),
          name: e.title,
          description: e.description || '',
          type: e.format,
          location: e.location || undefined,
          onlineLink: e.onlineLink || undefined,
          startDate: e.date || '',
          startTime: e.time || '',
          endTime: e.endTime || '',
          cutoffDate: e.cutoffDate || '',
          cutoffTime: e.cutoffTime || '',
          cost: e.cost ?? 0,
          minPax: e.minPax ?? 0,
          maxPax: e.maxPax ?? 0,
          currentSignups: e.attendees ?? 0,
          status: e.status,
          createdAt: e.createdAt,
          signups: [],
          remindersSent: e.remindersSent ?? false,
        }))
      );
    } catch (err) {
      console.error('Failed to load events:', err);
      setEvents([]);
      showToast('Could not load events', 'error');
    }
  };

  useEffect(() => {
    loadEvents();
  }, []);

  const handleGenerateDescription = async () => {
    if (!aiTopic.trim()) {
      showToast('⚠️ Enter event topic', 'error');
      return;
    }

    setAiDescLoading(true);
    const desc = await eventOptimizer.generateEventDescription(
      aiTopic,
      newEventType,
      aiAudience || 'Community members',
      ''
    );

    if (desc) {
      setNewDescription(desc);
      showToast('✅ Description generated!', 'success');
    } else {
      showToast('⚠️ Failed to generate description', 'error');
    }
    setAiDescLoading(false);
  };

  const handleSuggestEngagementFeatures = async () => {
    if (!newEventName.trim()) {
      showToast('⚠️ Enter event name first', 'error');
      return;
    }

    setAiEngagementLoading(true);
    const features = await eventOptimizer.suggestEngagementFeatures(
      newEventName,
      newEventType,
      aiAudience || 'Community members'
    );

    if (features.length > 0) {
      setSuggestedFeatures(features);
      showToast(`✅ ${features.length} engagement strategies suggested!`, 'success');
    } else {
      showToast('⚠️ Failed to suggest strategies', 'error');
    }
    setAiEngagementLoading(false);
  };

  // Editing reuses the create form rather than a second one: the fields are
  // identical, and two forms drifting apart is how an edit screen ends up
  // silently unable to change something the create screen can set.
  const startEdit = (event: Event) => {
    setEditingId(event.id);
    setNewEventName(event.name);
    setNewDescription(event.description || '');
    setNewEventType(event.type);
    setNewLocation(event.location || '');
    setNewStartDate(event.startDate || '');
    setNewStartTime(event.startTime || '09:00');
    setNewEndTime(event.endTime || '11:00');
    setNewCutoffDate(event.cutoffDate || '');
    setNewCutoffTime(event.cutoffTime || '17:00');
    setNewCost(String(event.cost ?? 0));
    setNewMinPax(String(event.minPax ?? 10));
    setNewMaxPax(String(event.maxPax ?? 50));
    setActiveTab('create');
  };

  const resetForm = () => {
    setEditingId(null);
    setNewEventName('');
    setNewDescription('');
    setNewLocation('');
    setNewStartDate('');
    setNewCutoffDate('');
    setNewCost('0');
    setNewMinPax('10');
    setNewMaxPax('50');
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    if (!newEventName.trim()) {
      showToast('⚠️ Event name is required', 'error');
      return;
    }
    try {
      const res = await fetch(`${API_URL}/api/events/${editingId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: newEventName,
          description: newDescription,
          format: newEventType,
          location: newLocation || null,
          date: newStartDate || null,
          time: newStartTime,
          endTime: newEndTime,
          cutoffDate: newCutoffDate || null,
          cutoffTime: newCutoffTime,
          cost: parseFloat(newCost),
          minPax: parseInt(newMinPax),
          maxPax: parseInt(newMaxPax),
        }),
      });
      if (!res.ok) {
        const result = await res.json().catch(() => ({}));
        showToast(result.error || 'Could not save that event', 'error');
        return;
      }
      resetForm();
      await loadEvents();
      showToast('✅ Event updated!', 'success');
      setActiveTab('events');
    } catch (err) {
      console.error('Failed to save event:', err);
      showToast('Could not save that event', 'error');
    }
  };

  const handleCreateEvent = async () => {
    if (!newEventName.trim() || !newDescription.trim() || !newStartDate || !newCutoffDate) {
      showToast('⚠️ Fill in all required fields', 'error');
      return;
    }

    if (newEventType === 'offline' && !newLocation.trim()) {
      showToast('⚠️ Location required for offline events', 'error');
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/events`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: newEventName,
          description: newDescription,
          format: newEventType,
          location: newLocation || null,
          onlineLink:
            newEventType === 'online'
              ? eventOptimizer.generateAccessLink(`evt_${Date.now()}`)
              : null,
          date: newStartDate,
          time: newStartTime,
          endTime: newEndTime,
          cutoffDate: newCutoffDate,
          cutoffTime: newCutoffTime,
          cost: parseFloat(newCost),
          minPax: parseInt(newMinPax),
          maxPax: parseInt(newMaxPax),
        }),
      });

      const result = await res.json();
      if (!res.ok) {
        showToast(result.error || 'Could not create that event', 'error');
        return;
      }
      await loadEvents();
    } catch (err) {
      console.error('Failed to create event:', err);
      showToast('Could not create that event', 'error');
      return;
    }

    showToast('✅ Event created!', 'success');
    setActiveTab('events');
  };

  const handleDeleteEvent = async (id: string) => {
    if (!confirm('Delete this event?')) return;
    try {
      const res = await fetch(`${API_URL}/api/events/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (!res.ok) {
        const result = await res.json().catch(() => ({}));
        showToast(result.error || 'Could not delete that event', 'error');
        return;
      }
      await loadEvents();
      showToast('🗑️ Event deleted', 'success');
    } catch (err) {
      console.error('Failed to delete event:', err);
      showToast('Could not delete that event', 'error');
    }
  };

  const handlePublishEvent = async (id: string) => {
    try {
      // 'active' is what GET /api/events filters on, so this is the moment the
      // event becomes visible in MyKampung.
      const res = await fetch(`${API_URL}/api/events/${id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'active' }),
      });
      if (!res.ok) {
        const result = await res.json().catch(() => ({}));
        showToast(result.error || 'Could not publish that event', 'error');
        return;
      }
      await loadEvents();
      showToast('📤 Published to MyKampung!', 'success');
    } catch (err) {
      console.error('Failed to publish event:', err);
      showToast('Could not publish that event', 'error');
    }
  };

  const statusColors = {
    draft: '#2196F3',
    active: '#4CAF50',
    cancelled: '#F44336',
    completed: '#999',
  };

  return (
    <AdminLayout>
      <div style={{ padding: '16px', background: '#fff' }}>
        <ToastContainer toasts={toasts} onClose={removeToast} />

        {/* Header */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#333' }}>
              🎉 Events Management
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
              }}
              title="Go back"
            >
              ←
            </button>
          </div>
          <p style={{ fontSize: '14px', color: '#666' }}>
            Create, manage, and promote events to boost community engagement
          </p>
        </div>

        {/* TAB NAVIGATION */}
        <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', borderBottom: '2px solid #FFD9B3' }}>
          {(['events', 'create', 'ai-assist'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '12px 16px',
                background: activeTab === tab ? '#FFD9B3' : 'transparent',
                color: activeTab === tab ? '#333' : '#999',
                border: 'none',
                borderBottom: activeTab === tab ? '3px solid #FF6B35' : 'none',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '14px',
                transition: 'all 0.2s',
              }}
            >
              {tab === 'events' ? '📅 Events' : tab === 'create' ? '➕ Create' : '🤖 AI Assist'}
            </button>
          ))}
        </div>

        {/* EVENTS LIST TAB */}
        {activeTab === 'events' && (
          <div style={{ display: 'grid', gap: '16px' }}>
            {events.length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center', color: '#999' }}>
                No events yet. Create one to get started!
              </div>
            ) : (
              events.map(event => {
                const metrics = eventOptimizer.calculateEventMetrics(event);
                return (
                  <div
                    key={event.id}
                    style={{
                      padding: '16px',
                      background: 'white',
                      border: `2px solid ${statusColors[event.status]}`,
                      borderRadius: '8px',
                    }}
                  >
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '12px', alignItems: 'start', marginBottom: '12px' }}>
                      <div>
                        <div style={{ fontSize: '16px', fontWeight: '600', color: '#333', marginBottom: '4px' }}>
                          {event.type === 'online' ? '🌐' : '📍'} {event.name}
                        </div>
                        <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>
                          {event.type === 'online' ? 'Virtual Event' : `📍 ${event.location}`}
                        </div>
                        <div style={{ fontSize: '13px', color: '#555', marginBottom: '8px', lineHeight: '1.4' }}>
                          {event.description.substring(0, 150)}...
                        </div>
                      </div>
                      <span
                        style={{
                          padding: '6px 12px',
                          background: statusColors[event.status],
                          color: 'white',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: '600',
                          whiteSpace: 'nowrap',
                          height: 'fit-content',
                        }}
                      >
                        {event.status.toUpperCase()}
                      </span>
                    </div>

                    {/* Key Metrics */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '12px', fontSize: '12px' }}>
                      <div style={{ background: '#FFF8F5', padding: '8px', borderRadius: '4px' }}>
                        <div style={{ fontSize: '10px', color: '#999', marginBottom: '2px' }}>Signups</div>
                        <div style={{ fontWeight: '600', color: '#FF6B35' }}>
                          {event.currentSignups}/{event.maxPax}
                        </div>
                      </div>
                      <div style={{ background: '#FFF8F5', padding: '8px', borderRadius: '4px' }}>
                        <div style={{ fontSize: '10px', color: '#999', marginBottom: '2px' }}>Capacity</div>
                        <div style={{ fontWeight: '600', color: '#FF6B35' }}>{metrics.capacityPercent}%</div>
                      </div>
                      <div style={{ background: '#FFF8F5', padding: '8px', borderRadius: '4px' }}>
                        <div style={{ fontSize: '10px', color: '#999', marginBottom: '2px' }}>Event Date</div>
                        <div style={{ fontWeight: '600', color: '#333' }}>{new Date(event.startDate).toLocaleDateString()}</div>
                      </div>
                      <div style={{ background: '#FFF8F5', padding: '8px', borderRadius: '4px' }}>
                        <div style={{ fontSize: '10px', color: '#999', marginBottom: '2px' }}>Cutoff</div>
                        <div style={{ fontWeight: '600', color: metrics.cutoffReached ? '#F44336' : '#4CAF50' }}>
                          {new Date(event.cutoffDate).toLocaleDateString()}
                        </div>
                      </div>
                    </div>

                    {/* Cost & Min Pax */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginBottom: '12px', fontSize: '12px' }}>
                      <div>
                        <span style={{ color: '#666' }}>💰 Cost: </span>
                        <strong>{event.cost > 0 ? `$${event.cost}` : 'FREE'}</strong>
                      </div>
                      <div>
                        <span style={{ color: '#666' }}>👥 Min Pax: </span>
                        <strong>{event.minPax}</strong>
                        {metrics.hasMinPax ? <span style={{ color: '#4CAF50' }}> ✓</span> : <span style={{ color: '#F44336' }}> ✗</span>}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                      {event.status === 'draft' && (
                        <button
                          onClick={() => handlePublishEvent(event.id)}
                          style={{
                            padding: '8px',
                            background: '#4CAF50',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            fontSize: '12px',
                          }}
                        >
                          📤 Publish
                        </button>
                      )}
                      {event.type === 'online' && event.status === 'active' && (
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(event.onlineLink || '');
                            showToast('📋 Link copied!', 'success');
                          }}
                          style={{
                            padding: '8px',
                            background: '#2196F3',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            fontSize: '12px',
                          }}
                        >
                          🔗 Copy Link
                        </button>
                      )}
                      <button
                        onClick={() => startEdit(event)}
                        style={{
                          padding: '8px 16px', background: 'white', color: '#FF6B35',
                          border: '2px solid #FF6B35', borderRadius: '6px',
                          fontSize: '13px', fontWeight: '600', cursor: 'pointer',
                          marginRight: '8px',
                        }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteEvent(event.id)}
                        style={{
                          padding: '8px',
                          background: '#F44336',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          fontSize: '12px',
                        }}
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* CREATE EVENT TAB */}
        {activeTab === 'create' && (
          <div style={{ display: 'grid', gap: '16px' }}>
            <div style={{ padding: '16px', background: '#FFF8F5', borderRadius: '8px', border: '2px solid #FFD9B3' }}>
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#333', marginBottom: '12px' }}>
                ➕ Create New Event
              </div>

              <div style={{ display: 'grid', gap: '12px' }}>
                {/* Event Name */}
                <input
                  type="text"
                  placeholder="Event name"
                  value={newEventName}
                  onChange={(e) => setNewEventName(e.target.value)}
                  style={{ padding: '10px 12px', border: '2px solid #FFD9B3', borderRadius: '6px', fontSize: '14px' }}
                  maxLength={100}
                />

                {/* Event Type */}
                <select
                  value={newEventType}
                  onChange={(e) => setNewEventType(e.target.value as 'online' | 'offline')}
                  style={{ padding: '10px 12px', border: '2px solid #FFD9B3', borderRadius: '6px', fontSize: '14px', cursor: 'pointer' }}
                >
                  <option value="online">🌐 Online Event</option>
                  <option value="offline">📍 Offline Event</option>
                </select>

                {/* Location (for offline) */}
                {newEventType === 'offline' && (
                  <input
                    type="text"
                    placeholder="Event location (address)"
                    value={newLocation}
                    onChange={(e) => setNewLocation(e.target.value)}
                    style={{ padding: '10px 12px', border: '2px solid #FFD9B3', borderRadius: '6px', fontSize: '14px' }}
                    maxLength={200}
                  />
                )}

                {/* Description */}
                <textarea
                  placeholder="Event description (or use AI to generate)"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  style={{
                    padding: '10px 12px',
                    border: `2px solid ${newDescription ? '#FF6B35' : '#FFD9B3'}`,
                    borderRadius: '6px',
                    fontSize: '14px',
                    minHeight: '100px',
                    fontFamily: 'system-ui',
                  }}
                  maxLength={1000}
                />

                {/* Date & Time */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: '600', color: '#333', display: 'block', marginBottom: '6px' }}>
                      📅 Event Date
                    </label>
                    <input
                      type="date"
                      value={newStartDate}
                      onChange={(e) => setNewStartDate(e.target.value)}
                      style={{ padding: '10px 12px', border: '2px solid #FFD9B3', borderRadius: '6px', fontSize: '14px', width: '100%' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: '600', color: '#333', display: 'block', marginBottom: '6px' }}>
                      🕐 Start Time
                    </label>
                    <input
                      type="time"
                      value={newStartTime}
                      onChange={(e) => setNewStartTime(e.target.value)}
                      style={{ padding: '10px 12px', border: '2px solid #FFD9B3', borderRadius: '6px', fontSize: '14px', width: '100%' }}
                    />
                  </div>
                </div>

                {/* Cutoff Date & Time */}
                <div style={{ padding: '12px', background: 'white', borderRadius: '6px', border: '1px solid #FFD9B3' }}>
                  <div style={{ fontSize: '12px', fontWeight: '600', color: '#333', marginBottom: '8px' }}>
                    ⏰ Registration Cutoff
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <input
                      type="date"
                      value={newCutoffDate}
                      onChange={(e) => setNewCutoffDate(e.target.value)}
                      style={{ padding: '8px 12px', border: '2px solid #FFD9B3', borderRadius: '6px', fontSize: '13px' }}
                    />
                    <input
                      type="time"
                      value={newCutoffTime}
                      onChange={(e) => setNewCutoffTime(e.target.value)}
                      style={{ padding: '8px 12px', border: '2px solid #FFD9B3', borderRadius: '6px', fontSize: '13px' }}
                    />
                  </div>
                  <div style={{ fontSize: '11px', color: '#666', marginTop: '6px' }}>
                    💡 After cutoff, registered users will get access link (online events)
                  </div>
                </div>

                {/* Cost & Capacity */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: '600', color: '#333', display: 'block', marginBottom: '6px' }}>
                      💰 Cost ($)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.50"
                      placeholder="0"
                      value={newCost}
                      onChange={(e) => setNewCost(e.target.value)}
                      style={{ padding: '8px 12px', border: '2px solid #FFD9B3', borderRadius: '6px', fontSize: '13px', width: '100%' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: '600', color: '#333', display: 'block', marginBottom: '6px' }}>
                      👥 Min Pax
                    </label>
                    <input
                      type="number"
                      min="1"
                      placeholder="10"
                      value={newMinPax}
                      onChange={(e) => setNewMinPax(e.target.value)}
                      style={{ padding: '8px 12px', border: '2px solid #FFD9B3', borderRadius: '6px', fontSize: '13px', width: '100%' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: '600', color: '#333', display: 'block', marginBottom: '6px' }}>
                      👥 Max Pax
                    </label>
                    <input
                      type="number"
                      min="1"
                      placeholder="50"
                      value={newMaxPax}
                      onChange={(e) => setNewMaxPax(e.target.value)}
                      style={{ padding: '8px 12px', border: '2px solid #FFD9B3', borderRadius: '6px', fontSize: '13px', width: '100%' }}
                    />
                  </div>
                </div>

                {editingId && (
                  <button
                    onClick={resetForm}
                    style={{
                      padding: '12px', background: 'white', color: '#666',
                      border: '2px solid #ccc', borderRadius: '6px',
                      fontWeight: '600', cursor: 'pointer', fontSize: '14px',
                      marginBottom: '8px',
                    }}
                  >
                    Cancel edit
                  </button>
                )}
                <button
                  onClick={editingId ? handleSaveEdit : handleCreateEvent}
                  style={{
                    padding: '12px',
                    background: 'linear-gradient(135deg, #FF6B35 0%, #FF8C5A 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    fontSize: '14px',
                  }}
                >
                  {editingId ? '💾 Save Changes' : '➕ Create Event'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* AI ASSIST TAB */}
        {activeTab === 'ai-assist' && (
          <div style={{ display: 'grid', gap: '16px' }}>
            {/* AI Description Generation */}
            <div style={{ padding: '16px', background: '#FFF8F5', borderRadius: '8px', border: '2px solid #FFD9B3' }}>
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#333', marginBottom: '12px' }}>
                ✨ AI Event Description Generator
              </div>

              <div style={{ display: 'grid', gap: '12px' }}>
                <textarea
                  placeholder="E.g., 'Networking breakfast for professionals', 'Virtual workshop on personal finance', 'Volunteer cleanup day at East Coast Park'"
                  value={aiTopic}
                  onChange={(e) => setAiTopic(e.target.value)}
                  style={{ padding: '10px 12px', border: '2px solid #FFD9B3', borderRadius: '6px', fontSize: '14px', minHeight: '80px', fontFamily: 'system-ui' }}
                />

                <input
                  type="text"
                  placeholder="Target audience (e.g., 'Working professionals', 'Students', 'Families with kids')"
                  value={aiAudience}
                  onChange={(e) => setAiAudience(e.target.value)}
                  style={{ padding: '10px 12px', border: '2px solid #FFD9B3', borderRadius: '6px', fontSize: '14px' }}
                />

                <button
                  onClick={handleGenerateDescription}
                  disabled={aiDescLoading}
                  style={{
                    padding: '10px',
                    background: aiDescLoading ? '#ccc' : '#FF6B35',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontWeight: '600',
                    cursor: aiDescLoading ? 'wait' : 'pointer',
                    fontSize: '14px',
                  }}
                >
                  {aiDescLoading ? '⏳ Generating...' : '🎯 Generate Description'}
                </button>

                {newDescription && (
                  <div style={{ padding: '12px', background: 'white', borderRadius: '6px', border: '1px solid #FFD9B3' }}>
                    <div style={{ fontSize: '12px', fontWeight: '600', color: '#333', marginBottom: '8px' }}>
                      ✓ Generated Description
                    </div>
                    <div style={{ fontSize: '13px', color: '#555', lineHeight: '1.5' }}>
                      {newDescription}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* AI Engagement Strategies */}
            {newEventName && (
              <div style={{ padding: '16px', background: '#FFF8F5', borderRadius: '8px', border: '2px solid #FFD9B3' }}>
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#333', marginBottom: '12px' }}>
                  🚀 AI Engagement Strategies
                </div>

                <button
                  onClick={handleSuggestEngagementFeatures}
                  disabled={aiEngagementLoading}
                  style={{
                    width: '100%',
                    padding: '10px',
                    background: aiEngagementLoading ? '#ccc' : '#FF6B35',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontWeight: '600',
                    cursor: aiEngagementLoading ? 'wait' : 'pointer',
                    fontSize: '14px',
                    marginBottom: '12px',
                  }}
                >
                  {aiEngagementLoading ? '⏳ Analyzing...' : '🔥 Suggest Engagement Strategies'}
                </button>

                {suggestedFeatures.length > 0 && (
                  <div style={{ display: 'grid', gap: '12px' }}>
                    {suggestedFeatures.map((feature, idx) => (
                      <div
                        key={idx}
                        style={{
                          padding: '12px',
                          background: 'white',
                          borderRadius: '6px',
                          border: '1px solid #FFD9B3',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                          <div style={{ fontSize: '14px', fontWeight: '600', color: '#333' }}>
                            {feature.icon} {feature.name}
                          </div>
                          <span
                            style={{
                              fontSize: '10px',
                              fontWeight: '600',
                              color: '#FF6B35',
                              background: '#FFE4C4',
                              padding: '3px 8px',
                              borderRadius: '3px',
                            }}
                          >
                            {feature.category.toUpperCase()}
                          </span>
                        </div>
                        <div style={{ fontSize: '12px', color: '#666', lineHeight: '1.4' }}>
                          {feature.description}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
