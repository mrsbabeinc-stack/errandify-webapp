import React, { useState, useEffect } from 'react';
import { generateText } from '../../utils/aiClient';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useToast, ToastContainer } from '../../components/Toast';
import AdminLayout from '../../components/admin/AdminLayout';
import { eventOptimizer, Event, EventSignup, EventEngagementFeature } from '../../utils/eventOptimizer';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

/** Which reminder can be sent, and what it is called on screen. */
const REMINDER_KINDS = [
  { kind: '7day', label: '7 days before' },
  { kind: '24hour', label: '24 hours before' },
  { kind: '1hour', label: '1 hour before' },
  { kind: 'dayof', label: 'On the day' },
] as const;

interface ReminderRecord {
  kind: string;
  sentCount: number;
  sentAt: string;
}

export default function EventReminders() {
  const navigate = useNavigate();
  const { toasts, showToast, removeToast } = useToast();
  const [activeTab, setActiveTab] = useState<'events' | 'create' | 'ai-assist'>('events');
  const [events, setEvents] = useState<Event[]>([]);
  const [reminders, setReminders] = useState<Record<string, ReminderRecord[]>>({});
  const [busy, setBusy] = useState<string | null>(null);

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
  const [bannerDesignLoading, setBannerDesignLoading] = useState(false);
  const [generatedBannerUrl, setGeneratedBannerUrl] = useState('');
  const [customEventBannerRequirements, setCustomEventBannerRequirements] = useState('');

  // AI assist state
  const [aiTopic, setAiTopic] = useState('');
  const [aiAudience, setAiAudience] = useState('');
  const [aiDescLoading, setAiDescLoading] = useState(false);
  const [aiEngagementLoading, setAiEngagementLoading] = useState(false);
  const [suggestedFeatures, setSuggestedFeatures] = useState<EventEngagementFeature[]>([]);

  // AI Insights state
  const [aiInsights, setAiInsights] = useState<string>('');
  const [aiInsightsLoading, setAiInsightsLoading] = useState(false);
  const [selectedEventForInsights, setSelectedEventForInsights] = useState<string | null>(null);
  const [promotionalLoading, setPromotionalLoading] = useState(false);
  const [conversionTips, setConversionTips] = useState<string>('');
  const [conversionLoading, setConversionLoading] = useState(false);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);

  /**
   * Events used to be kept in localStorage under the key 'events', which meant
   * this screen ran a second, private event system: an event created here was
   * invisible to the Events screen, to MyKampung, and to every user. Both
   * screens now read and write community_events through /api/events.
   *
   * `type` means something different at each end — here it is online/offline
   * (how you attend), while community_events.type is meetup/workshop/etc.
   * (what it is). The API calls the first one `format`, so that is what this
   * maps to; see migration 038.
   */
  const authHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('token')}`,
  });

  const fromApi = (e: any): Event => ({
    id: String(e.id),
    name: e.title,
    description: e.description || '',
    type: e.format === 'online' ? 'online' : 'offline',
    location: e.location || undefined,
    onlineLink: e.onlineLink || undefined,
    startDate: e.date || '',
    startTime: e.time || '',
    endTime: e.endTime || '',
    cutoffDate: e.cutoffDate || '',
    cutoffTime: e.cutoffTime || '',
    cost: Number(e.cost) || 0,
    minPax: Number(e.minPax) || 0,
    maxPax: Number(e.maxPax) || 0,
    currentSignups: Number(e.attendees) || 0,
    status: e.status,
    createdAt: e.createdAt,
    signups: [],
    remindersSent: Boolean(e.remindersSent),
  });

  const loadEvents = async () => {
    try {
      const res = await fetch(`${API_URL}/api/events/all`, { headers: authHeaders() });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const rows = (json.data || []).map(fromApi);
      setEvents(rows);

      // What has already gone out, per event, so a reminder cannot be sent
      // twice by accident and the admin can see the history.
      const histories = await Promise.all(
        rows.map(async (ev: Event) => {
          try {
            const r = await fetch(`${API_URL}/api/marcom/events/${ev.id}/reminders`, {
              headers: authHeaders(),
            });
            if (!r.ok) return [ev.id, []] as const;
            const j = await r.json();
            return [ev.id, j.data || []] as const;
          } catch {
            return [ev.id, []] as const;
          }
        })
      );
      setReminders(Object.fromEntries(histories));
    } catch (err) {
      console.error('Could not load events:', err);
      showToast('Could not load events', 'error');
    }
  };

  useEffect(() => { loadEvents(); }, []);

  /**
   * Sends one reminder to everyone signed up. Attendees only — a reminder for
   * an event you did not join would be marketing, not a reminder. There is no
   * recall on a sent message, hence the confirmation and the server-side
   * uniqueness check.
   */
  const handleSendReminder = async (event: Event, kind: string, label: string) => {
    if (!window.confirm(
      `Send the "${label}" reminder for "${event.name}" to its ${event.currentSignups} attendee(s)?\n\nThis cannot be undone, and each reminder can only be sent once.`
    )) return;

    setBusy(`${event.id}:${kind}`);
    try {
      const res = await fetch(`${API_URL}/api/marcom/events/${event.id}/reminders`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ kind }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      await loadEvents();
      showToast(`✅ Reminder sent to ${json.data.sent} of ${json.data.attempted}`, 'success');
      if (json.deliveryMode === 'logged-only') {
        showToast('No email provider configured — the email half was logged, not delivered', 'warning');
      }
    } catch (err: any) {
      showToast(err.message || 'Could not send that reminder', 'error');
    } finally {
      setBusy(null);
    }
  };

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

  const handleCreateEvent = async () => {
    if (!newEventName.trim() || !newDescription.trim() || !newStartDate || !newCutoffDate) {
      showToast('⚠️ Fill in all required fields', 'error');
      return;
    }

    if (newEventType === 'offline' && !newLocation.trim()) {
      showToast('⚠️ Location required for offline events', 'error');
      return;
    }

    setBusy('create');
    try {
      const res = await fetch(`${API_URL}/api/events`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          title: newEventName,
          description: newDescription,
          format: newEventType,
          location: newLocation || null,
          onlineLink: newEventType === 'online'
            ? eventOptimizer.generateAccessLink(`evt_${Date.now()}`)
            : null,
          date: newStartDate,
          time: newStartTime,
          endTime: newEndTime,
          cutoffDate: newCutoffDate,
          cutoffTime: newCutoffTime,
          cost: parseFloat(newCost) || 0,
          minPax: parseInt(newMinPax) || null,
          maxPax: parseInt(newMaxPax) || null,
          status: 'draft',
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);

      await loadEvents();
      setNewEventName('');
      setNewDescription('');
      setNewLocation('');
      setNewStartDate('');
      setNewCutoffDate('');
      setNewCost('0');
      setNewMinPax('10');
      setNewMaxPax('50');
      setAiTopic('');
      setSuggestedFeatures([]);
      setGeneratedBannerUrl('');
      setCustomEventBannerRequirements('');

      showToast('✅ Event saved as a draft — press Publish to open signups', 'success');
      setActiveTab('events');
    } catch (err: any) {
      showToast(err.message || 'Could not create that event', 'error');
    } finally {
      setBusy(null);
    }
  };

  const handleDeleteEvent = async (id: string) => {
    const event = events.find((e) => e.id === id);
    if (!confirm(
      event?.currentSignups
        ? `Delete "${event.name}"? ${event.currentSignups} person(s) have signed up and their registration goes with it.`
        : 'Delete this event?'
    )) return;
    setBusy(id);
    try {
      const res = await fetch(`${API_URL}/api/events/${id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      await loadEvents();
      showToast('🗑️ Event deleted', 'success');
    } catch (err: any) {
      showToast(err.message || 'Could not delete that event', 'error');
    } finally {
      setBusy(null);
    }
  };

  const handleGetEventInsights = async (eventId: string) => {
    const event = events.find(e => e.id === eventId);
    if (!event) return;

    setSelectedEventForInsights(eventId);
    setAiInsightsLoading(true);

    try {
      const metrics = eventOptimizer.calculateEventMetrics(event);
      const prompt = `Analyze this event and provide strategic recommendations to increase signups and engagement:

Event: "${event.name}"
Type: ${event.type}
Current Signups: ${event.currentSignups}/${event.maxPax} (${metrics.capacityPercent}% capacity)
Min Participants: ${event.minPax}
Cost: ${event.cost > 0 ? '$' + event.cost : 'FREE'}
Days Until Event: ${Math.ceil((new Date(event.startDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))}
${metrics.hasMinPax ? '✓ Minimum reached' : '⚠️ Minimum NOT reached'}

Provide:
1. Current status assessment (1-2 sentences)
2. Top 2-3 urgent actions to drive signups
3. Best promotion channels (email, social, in-app)
4. Ideal price/discount strategy
5. Expected outcome if recommendations followed

Be specific, actionable, and data-driven. Keep it under 200 words.`;

      const responseText = await generateText(prompt, { maxTokens: 400, temperature: 0.7 });

      const insights = responseText || 'Unable to generate insights';
      setAiInsights(insights);
      showToast('✅ Insights generated!', 'success');
    } catch (error) {
      console.error('Failed to get insights:', error);
      showToast('⚠️ Failed to generate insights', 'error');
    }
    setAiInsightsLoading(false);
  };

  const handleGeneratePromotion = async (eventId: string) => {
    const event = events.find(e => e.id === eventId);
    if (!event) return;

    setPromotionalLoading(true);

    try {
      const metrics = eventOptimizer.calculateEventMetrics(event);
      const message = await eventOptimizer.generatePromotionalMessage(
        event.name,
        metrics.spotsLeft
      );

      if (message) {
        showToast('✅ Promotional message generated!', 'success');
        navigator.clipboard.writeText(message);
        showToast('📋 Copied to clipboard!', 'success');
      }
    } catch (error) {
      console.error('Failed to generate promotion:', error);
      showToast('⚠️ Failed to generate promotion', 'error');
    }
    setPromotionalLoading(false);
  };

  const handleGenerateBannerDesign = async () => {
    if (!newEventName.trim() || !newDescription.trim()) {
      showToast('⚠️ Fill in event name and description first', 'error');
      return;
    }

    setBannerDesignLoading(true);

    try {
      const prompt = `You are a professional event banner designer. Create a detailed visual design description for an event banner/poster.

Event: "${newEventName}"
Type: ${newEventType}
Description: "${newDescription.substring(0, 200)}"
Cost: ${Number(newCost) > 0 ? '$' + newCost : 'FREE'}
Audience: ${aiAudience || 'Professional community'}
${customEventBannerRequirements.trim() ? `Custom Requirements: ${customEventBannerRequirements}` : ''}

Generate a vivid design description for a 1200x600px banner that includes:

1. **Color Scheme**: Suggest 2-3 primary colors (hex codes)
   - Use warm, inviting colors (avoid dark/dull)
   - Consider the event theme

2. **Layout Elements**:
   - Hero text positioning (event name, date, time)
   - Visual elements (icons, shapes, patterns)
   - Where to place location/cost info
   - CTA button placement

3. **Style & Mood**:
   - Professional vs casual tone
   - Modern, playful, corporate, community-focused?
   - Special design elements (ribbons, badges, ornaments)

4. **Typography**:
   - Suggest font styles (bold, elegant, friendly)
   - Text size hierarchy
   - Emphasis areas

5. **Visual Metaphors**:
   - Any relevant imagery (networking, growth, celebration)
   - Icons that represent the event theme

Format as detailed, actionable design brief. Be specific about colors, placement, and visual hierarchy.`;

      const responseText = await generateText(prompt, { maxTokens: 600, temperature: 0.8 });

      const bannerDesign = responseText || 'Unable to generate banner design';
      setGeneratedBannerUrl(bannerDesign);
      showToast('✅ Banner design created!', 'success');
    } catch (error) {
      console.error('Failed to generate banner:', error);
      showToast('⚠️ Failed to generate banner design', 'error');
    }
    setBannerDesignLoading(false);
  };

  const handleGenerateConversionTips = async (eventId: string) => {
    const event = events.find(e => e.id === eventId);
    if (!event) return;

    setConversionLoading(true);

    try {
      const metrics = eventOptimizer.calculateEventMetrics(event);
      const daysLeft = Math.ceil((new Date(event.cutoffDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

      const prompt = `You are a conversion optimization expert. Generate 5-7 specific, actionable tactics to increase event signups (getting more people to join):

Event: "${event.name}"
Current Status: ${event.currentSignups}/${event.maxPax} signups (${metrics.capacityPercent}% capacity)
Type: ${event.type}
Cost: ${event.cost > 0 ? '$' + event.cost : 'FREE'}
Days Until Cutoff: ${daysLeft}

For each tactic, include:
1. **Tactic Name**
2. Why it works (psychology/behavior)
3. Exact implementation (steps to take TODAY)
4. Expected impact (how many more signups)

Focus on:
- Urgency creation ("Only X spots left")
- Social proof ("X people already going")
- Value emphasis (what they gain)
- Friction removal (make signup easy)
- FOMO triggers (fear of missing out)

Format as numbered list with bold headers. Keep it practical and specific to THIS event.`;

      const responseText = await generateText(prompt, { maxTokens: 800, temperature: 0.75 });

      const tips = responseText || 'Unable to generate tips';
      setConversionTips(tips);
      setSelectedEventForInsights(eventId);
      showToast('✅ Conversion tactics generated!', 'success');
    } catch (error) {
      console.error('Failed to generate conversion tips:', error);
      showToast('⚠️ Failed to generate tactics', 'error');
    }
    setConversionLoading(false);
  };

  const handlePublishEvent = async (id: string) => {
    setBusy(id);
    try {
      const res = await fetch(`${API_URL}/api/events/${id}`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ status: 'active' }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      await loadEvents();
      showToast('📤 Published — it is now on MyKampung and open for signups', 'success');
    } catch (err: any) {
      showToast(err.message || 'Could not publish that event', 'error');
    } finally {
      setBusy(null);
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
                    <div style={{ display: 'grid', gridTemplateColumns: event.status === 'active' ? 'repeat(4, 1fr)' : 'repeat(2, 1fr)', gap: '10px', marginBottom: '12px' }}>
                      {event.status === 'draft' && (
                        <button
                          onClick={() => handlePublishEvent(event.id)}
                          style={{
                            padding: '12px 16px',
                            background: 'linear-gradient(135deg, #FF6B35 0%, #FF8C5A 100%)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            fontSize: '13px',
                            boxShadow: '0 4px 12px rgba(255, 107, 53, 0.3), inset 0 -2px 0 rgba(0,0,0,0.1)',
                            transform: 'translateY(0)',
                            transition: 'all 0.2s',
                          }}
                          onMouseDown={(e) => {
                            (e.target as HTMLButtonElement).style.transform = 'translateY(2px)';
                            (e.target as HTMLButtonElement).style.boxShadow = '0 2px 6px rgba(255, 107, 53, 0.2), inset 0 -1px 0 rgba(0,0,0,0.1)';
                          }}
                          onMouseUp={(e) => {
                            (e.target as HTMLButtonElement).style.transform = 'translateY(0)';
                            (e.target as HTMLButtonElement).style.boxShadow = '0 4px 12px rgba(255, 107, 53, 0.3), inset 0 -2px 0 rgba(0,0,0,0.1)';
                          }}
                        >
                          Publish Event
                        </button>
                      )}
                      {event.status === 'active' && (
                        <>
                          {event.type === 'online' && (
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(event.onlineLink || '');
                                showToast('📋 Link copied!', 'success');
                              }}
                              style={{
                                padding: '12px 16px',
                                background: 'linear-gradient(135deg, #FF6B35 0%, #FF8C5A 100%)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                fontWeight: '600',
                                cursor: 'pointer',
                                fontSize: '13px',
                                boxShadow: '0 4px 12px rgba(255, 107, 53, 0.3), inset 0 -2px 0 rgba(0,0,0,0.1)',
                                transform: 'translateY(0)',
                                transition: 'all 0.2s',
                              }}
                              onMouseDown={(e) => {
                                (e.target as HTMLButtonElement).style.transform = 'translateY(2px)';
                                (e.target as HTMLButtonElement).style.boxShadow = '0 2px 6px rgba(255, 107, 53, 0.2), inset 0 -1px 0 rgba(0,0,0,0.1)';
                              }}
                              onMouseUp={(e) => {
                                (e.target as HTMLButtonElement).style.transform = 'translateY(0)';
                                (e.target as HTMLButtonElement).style.boxShadow = '0 4px 12px rgba(255, 107, 53, 0.3), inset 0 -2px 0 rgba(0,0,0,0.1)';
                              }}
                            >
                              Copy Join Link
                            </button>
                          )}
                          <button
                            onClick={() => handleGetEventInsights(event.id)}
                            disabled={aiInsightsLoading}
                            style={{
                              padding: '12px 16px',
                              background: aiInsightsLoading ? '#ddd' : 'linear-gradient(135deg, #FF6B35 0%, #FF8C5A 100%)',
                              color: 'white',
                              border: 'none',
                              borderRadius: '8px',
                              fontWeight: '600',
                              cursor: aiInsightsLoading ? 'wait' : 'pointer',
                              fontSize: '13px',
                              boxShadow: '0 4px 12px rgba(255, 107, 53, 0.3), inset 0 -2px 0 rgba(0,0,0,0.1)',
                              transform: 'translateY(0)',
                              transition: 'all 0.2s',
                              opacity: aiInsightsLoading ? 0.7 : 1,
                            }}
                            onMouseDown={(e) => {
                              if (!aiInsightsLoading) {
                                (e.target as HTMLButtonElement).style.transform = 'translateY(2px)';
                                (e.target as HTMLButtonElement).style.boxShadow = '0 2px 6px rgba(255, 107, 53, 0.2), inset 0 -1px 0 rgba(0,0,0,0.1)';
                              }
                            }}
                            onMouseUp={(e) => {
                              if (!aiInsightsLoading) {
                                (e.target as HTMLButtonElement).style.transform = 'translateY(0)';
                                (e.target as HTMLButtonElement).style.boxShadow = '0 4px 12px rgba(255, 107, 53, 0.3), inset 0 -2px 0 rgba(0,0,0,0.1)';
                              }
                            }}
                          >
                            {aiInsightsLoading ? 'Analyzing...' : 'Insights'}
                          </button>
                          <button
                            onClick={() => handleGenerateConversionTips(event.id)}
                            disabled={conversionLoading}
                            style={{
                              padding: '12px 16px',
                              background: conversionLoading ? '#ddd' : 'linear-gradient(135deg, #FF6B35 0%, #FF8C5A 100%)',
                              color: 'white',
                              border: 'none',
                              borderRadius: '8px',
                              fontWeight: '600',
                              cursor: conversionLoading ? 'wait' : 'pointer',
                              fontSize: '13px',
                              boxShadow: '0 4px 12px rgba(255, 107, 53, 0.3), inset 0 -2px 0 rgba(0,0,0,0.1)',
                              transform: 'translateY(0)',
                              transition: 'all 0.2s',
                              opacity: conversionLoading ? 0.7 : 1,
                            }}
                            onMouseDown={(e) => {
                              if (!conversionLoading) {
                                (e.target as HTMLButtonElement).style.transform = 'translateY(2px)';
                                (e.target as HTMLButtonElement).style.boxShadow = '0 2px 6px rgba(255, 107, 53, 0.2), inset 0 -1px 0 rgba(0,0,0,0.1)';
                              }
                            }}
                            onMouseUp={(e) => {
                              if (!conversionLoading) {
                                (e.target as HTMLButtonElement).style.transform = 'translateY(0)';
                                (e.target as HTMLButtonElement).style.boxShadow = '0 4px 12px rgba(255, 107, 53, 0.3), inset 0 -2px 0 rgba(0,0,0,0.1)';
                              }
                            }}
                          >
                            {conversionLoading ? 'Generating...' : 'Boost Signups'}
                          </button>
                          <button
                            onClick={() => handleGeneratePromotion(event.id)}
                            disabled={promotionalLoading}
                            style={{
                              padding: '12px 16px',
                              background: promotionalLoading ? '#ddd' : 'linear-gradient(135deg, #FF6B35 0%, #FF8C5A 100%)',
                              color: 'white',
                              border: 'none',
                              borderRadius: '8px',
                              fontWeight: '600',
                              cursor: promotionalLoading ? 'wait' : 'pointer',
                              fontSize: '13px',
                              boxShadow: '0 4px 12px rgba(255, 107, 53, 0.3), inset 0 -2px 0 rgba(0,0,0,0.1)',
                              transform: 'translateY(0)',
                              transition: 'all 0.2s',
                              opacity: promotionalLoading ? 0.7 : 1,
                            }}
                            onMouseDown={(e) => {
                              if (!promotionalLoading) {
                                (e.target as HTMLButtonElement).style.transform = 'translateY(2px)';
                                (e.target as HTMLButtonElement).style.boxShadow = '0 2px 6px rgba(255, 107, 53, 0.2), inset 0 -1px 0 rgba(0,0,0,0.1)';
                              }
                            }}
                            onMouseUp={(e) => {
                              if (!promotionalLoading) {
                                (e.target as HTMLButtonElement).style.transform = 'translateY(0)';
                                (e.target as HTMLButtonElement).style.boxShadow = '0 4px 12px rgba(255, 107, 53, 0.3), inset 0 -2px 0 rgba(0,0,0,0.1)';
                              }
                            }}
                          >
                            {promotionalLoading ? 'Creating...' : 'Promo Message'}
                          </button>
                        </>
                      )}
                      {event.status !== 'draft' && (
                        <button
                          onClick={() => handleDeleteEvent(event.id)}
                          style={{
                            padding: '12px 16px',
                            background: 'linear-gradient(135deg, #FF6B35 0%, #FF8C5A 100%)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            fontSize: '13px',
                            boxShadow: '0 4px 12px rgba(255, 107, 53, 0.3), inset 0 -2px 0 rgba(0,0,0,0.1)',
                            transform: 'translateY(0)',
                            transition: 'all 0.2s',
                          }}
                          onMouseDown={(e) => {
                            (e.target as HTMLButtonElement).style.transform = 'translateY(2px)';
                            (e.target as HTMLButtonElement).style.boxShadow = '0 2px 6px rgba(255, 107, 53, 0.2), inset 0 -1px 0 rgba(0,0,0,0.1)';
                          }}
                          onMouseUp={(e) => {
                            (e.target as HTMLButtonElement).style.transform = 'translateY(0)';
                            (e.target as HTMLButtonElement).style.boxShadow = '0 4px 12px rgba(255, 107, 53, 0.3), inset 0 -2px 0 rgba(0,0,0,0.1)';
                          }}
                        >
                          Delete Event
                        </button>
                      )}
                    </div>

                    {/*
                      The reminders half of this screen, which never existed:
                      the page was called Event Reminders and had no way to
                      send one. Each kind sends once, to attendees only, and
                      the record of what went out lives on the server.
                    */}
                    {event.status === 'active' && (
                      <div style={{ padding: '12px', background: '#FFF8F5', borderRadius: '8px', border: '1px solid #FFD9B3', marginBottom: '12px' }}>
                        <div style={{ fontSize: '13px', fontWeight: '600', color: '#333', marginBottom: '8px' }}>
                          ⏰ Reminders — {event.currentSignups} attendee(s)
                        </div>
                        {event.currentSignups === 0 ? (
                          <div style={{ fontSize: '12px', color: '#999' }}>
                            Nobody has signed up yet, so there is no one to remind.
                          </div>
                        ) : (
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                            {REMINDER_KINDS.map(({ kind, label }) => {
                              const sent = (reminders[event.id] || []).find((r) => r.kind === kind);
                              const busyHere = busy === `${event.id}:${kind}`;
                              return (
                                <button
                                  key={kind}
                                  onClick={() => handleSendReminder(event, kind, label)}
                                  disabled={Boolean(sent) || busyHere}
                                  title={sent
                                    ? `Sent to ${sent.sentCount} on ${new Date(sent.sentAt).toLocaleString()}`
                                    : `Send the ${label} reminder now`}
                                  style={{
                                    padding: '8px 10px',
                                    background: sent ? '#E8F5E9' : busyHere ? '#ccc' : '#FF6B35',
                                    color: sent ? '#2e7d32' : 'white',
                                    border: sent ? '1px solid #A5D6A7' : 'none',
                                    borderRadius: '6px',
                                    fontWeight: '600',
                                    fontSize: '12px',
                                    cursor: sent || busyHere ? 'default' : 'pointer',
                                    textAlign: 'left',
                                  }}
                                >
                                  {sent ? `✓ ${label} — ${sent.sentCount} sent` : busyHere ? 'Sending…' : `Send ${label}`}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}

                    {/* AI Insights Display */}
                    {selectedEventForInsights === event.id && (aiInsights || conversionTips) && (
                      <div style={{ display: 'grid', gap: '12px', marginTop: '12px' }}>
                        {aiInsights && (
                          <div style={{ padding: '12px', background: '#FFF3E0', borderRadius: '6px', border: '1px solid #FFB74D' }}>
                            <div style={{ fontSize: '12px', fontWeight: '600', color: '#E65100', marginBottom: '8px' }}>
                              🧠 AI Strategic Insights
                            </div>
                            <div style={{ fontSize: '12px', color: '#333', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>
                              {aiInsights}
                            </div>
                          </div>
                        )}
                        {conversionTips && (
                          <div style={{ padding: '12px', background: '#E8F5E9', borderRadius: '6px', border: '1px solid #81C784' }}>
                            <div style={{ fontSize: '12px', fontWeight: '600', color: '#1B5E20', marginBottom: '8px' }}>
                              🎯 Conversion Tactics to Get More Sign-ups
                            </div>
                            <div style={{ fontSize: '11px', color: '#333', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                              {conversionTips}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
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

                {/* AI Banner Design Section */}
                <div style={{ padding: '16px', background: '#E8F5E9', borderRadius: '8px', border: '2px solid #81C784' }}>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: '#333', marginBottom: '12px' }}>
                    🎨 AI Banner Designer
                  </div>
                  <p style={{ fontSize: '12px', color: '#666', marginBottom: '12px' }}>
                    Generate a professional event banner/poster design based on your event info.
                  </p>

                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ fontSize: '12px', fontWeight: '600', color: '#333', display: 'block', marginBottom: '6px' }}>
                      💡 Your Design Requirements (Optional)
                    </label>
                    <textarea
                      placeholder="Add your custom requirements or design preferences"
                      value={customEventBannerRequirements}
                      onChange={(e) => setCustomEventBannerRequirements(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '2px solid #81C784',
                        borderRadius: '6px',
                        fontSize: '13px',
                        minHeight: '60px',
                        fontFamily: 'system-ui',
                        resize: 'vertical',
                      }}
                      maxLength={300}
                    />
                    <div style={{ fontSize: '11px', color: '#666', marginTop: '6px', fontStyle: 'italic' }}>
                      Examples: "Use vibrant colors", "Modern minimalist style", "Include celebration icons", "Gradient background", "Professional look"
                    </div>
                  </div>

                  <button
                    onClick={handleGenerateBannerDesign}
                    disabled={bannerDesignLoading || !newEventName.trim() || !newDescription.trim()}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      background: bannerDesignLoading ? '#ddd' : 'linear-gradient(135deg, #FF6B35 0%, #FF8C5A 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontWeight: '600',
                      cursor: bannerDesignLoading ? 'wait' : 'pointer',
                      fontSize: '14px',
                      boxShadow: '0 4px 12px rgba(255, 107, 53, 0.3)',
                      transform: 'translateY(0)',
                      transition: 'all 0.2s',
                      marginBottom: '12px',
                    }}
                    onMouseDown={(e) => {
                      if (!bannerDesignLoading) {
                        (e.target as HTMLButtonElement).style.transform = 'translateY(2px)';
                      }
                    }}
                    onMouseUp={(e) => {
                      if (!bannerDesignLoading) {
                        (e.target as HTMLButtonElement).style.transform = 'translateY(0)';
                      }
                    }}
                  >
                    {bannerDesignLoading ? '🎨 Designing Banner...' : '✨ Design Banner'}
                  </button>

                  {generatedBannerUrl && (
                    <div style={{ padding: '12px', background: 'white', borderRadius: '6px', border: '1px solid #81C784' }}>
                      <div style={{ fontSize: '12px', fontWeight: '600', color: '#1B5E20', marginBottom: '8px' }}>
                        ✓ Banner Design Guide
                      </div>
                      <div style={{ fontSize: '12px', color: '#333', lineHeight: '1.6', whiteSpace: 'pre-wrap', maxHeight: '300px', overflow: 'auto' }}>
                        {generatedBannerUrl}
                      </div>
                      <p style={{ fontSize: '11px', color: '#666', marginTop: '8px', fontStyle: 'italic' }}>
                        💡 Use this design guide to create your banner in Canva, Photoshop, or any design tool
                      </p>
                    </div>
                  )}
                </div>

                <button
                  onClick={handleCreateEvent}
                  style={{
                    padding: '12px',
                    background: 'linear-gradient(135deg, #FF6B35 0%, #FF8C5A 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    fontSize: '14px',
                    marginTop: '12px',
                  }}
                >
                  ➕ Create Event
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
