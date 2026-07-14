import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useToast, ToastContainer } from '../../components/Toast';
import AdminLayout from '../../components/admin/AdminLayout';
import { Event } from '../../utils/eventOptimizer';

interface EventReminder {
  id: string;
  eventId: string;
  eventName: string;
  description: string;
  reminderTime: string; // 1-week, 2-days, 1-day, 2-hours
  scheduledDateTime: string;
  audience: string;
  status: 'pending' | 'sent' | 'failed';
  sentAt?: string;
  createdAt: string;
}

export default function EventReminders() {
  const navigate = useNavigate();
  const { toasts, showToast, removeToast } = useToast();
  const [reminders, setReminders] = useState<EventReminder[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [activeTab, setActiveTab] = useState<'reminders' | 'manual'>('reminders');
  const [selectedEventId, setSelectedEventId] = useState('');
  const [reminderTime, setReminderTime] = useState('1-day');
  const [customMessage, setCustomMessage] = useState('');

  useEffect(() => {
    // Load events
    const savedEvents = localStorage.getItem('events');
    if (savedEvents) {
      setEvents(JSON.parse(savedEvents));
    }

    // Load reminders
    const saved = localStorage.getItem('eventReminders');
    if (saved) {
      setReminders(JSON.parse(saved));
    } else {
      // Generate auto reminders from events
      generateAutoReminders();
    }
  }, []);

  const generateAutoReminders = () => {
    const savedEvents = localStorage.getItem('events');
    if (!savedEvents) return;

    const events: Event[] = JSON.parse(savedEvents);
    const autoReminders: EventReminder[] = [];

    events.forEach(event => {
      if (event.status === 'active') {
        const eventDate = new Date(`${event.startDate}T${event.startTime}`);

        // Generate reminders at different intervals
        const reminderTimes = [
          { label: '1-week', offset: 7 * 24 * 60 * 60 * 1000 },
          { label: '2-days', offset: 2 * 24 * 60 * 60 * 1000 },
          { label: '1-day', offset: 24 * 60 * 60 * 1000 },
          { label: '2-hours', offset: 2 * 60 * 60 * 1000 },
        ];

        reminderTimes.forEach(({ label, offset }) => {
          const reminderDate = new Date(eventDate.getTime() - offset);
          if (reminderDate > new Date()) {
            autoReminders.push({
              id: `reminder_${event.id}_${label}`,
              eventId: event.id,
              eventName: event.name,
              description: `Reminder: ${event.name} starts in ${label.replace('-', ' ')}`,
              reminderTime: label,
              scheduledDateTime: reminderDate.toISOString(),
              audience: event.type === 'online' ? 'All Signups' : 'All Signups',
              status: 'pending',
              createdAt: new Date().toISOString(),
            });
          }
        });
      }
    });

    setReminders(autoReminders);
    localStorage.setItem('eventReminders', JSON.stringify(autoReminders));
  };

  const handleSendReminder = (reminderId: string) => {
    const updated = reminders.map(r =>
      r.id === reminderId
        ? { ...r, status: 'sent' as const, sentAt: new Date().toISOString() }
        : r
    );
    setReminders(updated);
    localStorage.setItem('eventReminders', JSON.stringify(updated));
    showToast('✅ Reminder sent to all attendees!', 'success');
  };

  const handleSendCustomReminder = () => {
    if (!selectedEventId || !customMessage.trim()) {
      showToast('⚠️ Select event and enter message', 'error');
      return;
    }

    const event = events.find(e => e.id === selectedEventId);
    if (!event) return;

    const newReminder: EventReminder = {
      id: `reminder_${Date.now()}`,
      eventId: selectedEventId,
      eventName: event.name,
      description: customMessage,
      reminderTime: 'custom',
      scheduledDateTime: new Date().toISOString(),
      audience: 'All Signups',
      status: 'sent',
      sentAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    const updated = [...reminders, newReminder];
    setReminders(updated);
    localStorage.setItem('eventReminders', JSON.stringify(updated));
    setCustomMessage('');
    setSelectedEventId('');
    showToast('✅ Custom reminder sent!', 'success');
  };

  const statusColors = {
    pending: '#2196F3',
    sent: '#4CAF50',
    failed: '#F44336',
  };

  return (
    <AdminLayout>
      <div style={{ padding: '16px', background: '#fff' }}>
        <ToastContainer toasts={toasts} onClose={removeToast} />

        {/* Header */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#333' }}>
              🔔 Event Reminders
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
            Manage automatic & manual event reminders and notifications
          </p>
        </div>

        {/* TAB NAVIGATION */}
        <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', borderBottom: '2px solid #FFD9B3' }}>
          <button
            onClick={() => setActiveTab('reminders')}
            style={{
              padding: '12px 16px',
              background: activeTab === 'reminders' ? '#FFD9B3' : 'transparent',
              color: activeTab === 'reminders' ? '#333' : '#999',
              border: 'none',
              borderBottom: activeTab === 'reminders' ? '3px solid #FF6B35' : 'none',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '14px',
            }}
          >
            📬 Auto Reminders
          </button>
          <button
            onClick={() => setActiveTab('manual')}
            style={{
              padding: '12px 16px',
              background: activeTab === 'manual' ? '#FFD9B3' : 'transparent',
              color: activeTab === 'manual' ? '#333' : '#999',
              border: 'none',
              borderBottom: activeTab === 'manual' ? '3px solid #FF6B35' : 'none',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '14px',
            }}
          >
            ✉️ Send Custom
          </button>
        </div>

        {/* AUTO REMINDERS TAB */}
        {activeTab === 'reminders' && (
          <div style={{ display: 'grid', gap: '16px' }}>
            <div style={{ padding: '12px', background: '#FFF8F5', borderRadius: '6px', border: '1px solid #FFD9B3' }}>
              <div style={{ fontSize: '12px', color: '#666', lineHeight: '1.5' }}>
                💡 Automatic reminders are generated from your events at 1-week, 2-days, 1-day, and 2-hours before each event.
                Click "Send Now" to dispatch immediately or wait for scheduled times.
              </div>
            </div>

            <div style={{ display: 'grid', gap: '12px' }}>
              {reminders.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: '#999' }}>
                  No reminders yet. Create an event first!
                </div>
              ) : (
                reminders.map(reminder => (
                  <div
                    key={reminder.id}
                    style={{
                      padding: '16px',
                      background: 'white',
                      border: `2px solid ${statusColors[reminder.status]}`,
                      borderRadius: '8px',
                    }}
                  >
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '12px', alignItems: 'start', marginBottom: '12px' }}>
                      <div>
                        <div style={{ fontWeight: '600', color: '#333', marginBottom: '4px', fontSize: '15px' }}>
                          {reminder.eventName}
                        </div>
                        <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>
                          {reminder.description}
                        </div>
                      </div>
                      <span
                        style={{
                          padding: '6px 12px',
                          background: statusColors[reminder.status],
                          color: 'white',
                          borderRadius: '4px',
                          fontSize: '10px',
                          fontWeight: '600',
                          whiteSpace: 'nowrap',
                          height: 'fit-content',
                        }}
                      >
                        {reminder.status.toUpperCase()}
                      </span>
                    </div>

                    <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>
                      ⏰ Scheduled: {new Date(reminder.scheduledDateTime).toLocaleString()} • Timing: {reminder.reminderTime.replace('-', ' ')}
                    </div>
                    <div style={{ fontSize: '11px', color: '#999', marginBottom: '12px' }}>
                      👥 Audience: {reminder.audience}
                      {reminder.sentAt && ` • Sent: ${new Date(reminder.sentAt).toLocaleString()}`}
                    </div>

                    {reminder.status === 'pending' && (
                      <button
                        onClick={() => handleSendReminder(reminder.id)}
                        style={{
                          padding: '8px 16px',
                          background: '#FF6B35',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          fontSize: '12px',
                        }}
                      >
                        📤 Send Now
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* CUSTOM REMINDER TAB */}
        {activeTab === 'manual' && (
          <div style={{ display: 'grid', gap: '16px' }}>
            <div style={{ padding: '16px', background: '#FFF8F5', borderRadius: '8px', border: '2px solid #FFD9B3' }}>
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#333', marginBottom: '12px' }}>
                ✉️ Send Custom Reminder
              </div>

              <div style={{ display: 'grid', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: '#333', display: 'block', marginBottom: '6px' }}>
                    Select Event
                  </label>
                  <select
                    value={selectedEventId}
                    onChange={(e) => setSelectedEventId(e.target.value)}
                    style={{ padding: '10px 12px', border: '2px solid #FFD9B3', borderRadius: '6px', fontSize: '14px', cursor: 'pointer', width: '100%' }}
                  >
                    <option value="">Choose an event...</option>
                    {events.map(event => (
                      <option key={event.id} value={event.id}>
                        {event.name} ({event.type === 'online' ? '🌐' : '📍'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: '#333', display: 'block', marginBottom: '6px' }}>
                    Reminder Message
                  </label>
                  <textarea
                    placeholder="Type your custom reminder message..."
                    value={customMessage}
                    onChange={(e) => setCustomMessage(e.target.value)}
                    style={{
                      padding: '10px 12px',
                      border: '2px solid #FFD9B3',
                      borderRadius: '6px',
                      fontSize: '14px',
                      minHeight: '100px',
                      fontFamily: 'system-ui',
                      width: '100%',
                    }}
                    maxLength={500}
                  />
                  <div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>
                    {customMessage.length}/500 characters
                  </div>
                </div>

                <button
                  onClick={handleSendCustomReminder}
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
                  📤 Send Custom Reminder
                </button>
              </div>
            </div>

            {/* Recent Sent Reminders */}
            {reminders.filter(r => r.reminderTime === 'custom').length > 0 && (
              <div style={{ display: 'grid', gap: '12px' }}>
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#333' }}>
                  📋 Recent Custom Reminders
                </div>
                {reminders
                  .filter(r => r.reminderTime === 'custom')
                  .slice(-5)
                  .map(reminder => (
                    <div key={reminder.id} style={{ padding: '12px', background: 'white', border: '1px solid #FFD9B3', borderRadius: '6px' }}>
                      <div style={{ fontSize: '13px', fontWeight: '600', color: '#333', marginBottom: '4px' }}>
                        {reminder.eventName}
                      </div>
                      <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>
                        {reminder.description}
                      </div>
                      <div style={{ fontSize: '10px', color: '#999' }}>
                        ✓ Sent: {reminder.sentAt ? new Date(reminder.sentAt).toLocaleString() : 'N/A'}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
