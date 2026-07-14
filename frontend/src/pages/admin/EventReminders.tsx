import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useToast, ToastContainer } from '../../components/Toast';
import AdminLayout from '../../components/admin/AdminLayout';

interface EventReminder {
  id: string;
  eventName: string;
  description: string;
  scheduledDate: string;
  reminderTiming: string;
  audience: string;
  status: 'active' | 'completed' | 'cancelled';
  createdAt: string;
}

export default function EventReminders() {
  const navigate = useNavigate();
  const { toasts, showToast, removeToast } = useToast();
  const [reminders, setReminders] = useState<EventReminder[]>([]);
  const [newEventName, setNewEventName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newTiming, setNewTiming] = useState('24-hours');

  useEffect(() => {
    const saved = localStorage.getItem('eventReminders');
    if (saved) {
      setReminders(JSON.parse(saved));
    } else {
      const demoReminders: EventReminder[] = [
        {
          id: 'er_1',
          eventName: 'Referral Program Ends',
          description: 'Reminder: Referral bonus ending soon',
          scheduledDate: new Date(Date.now() + 604800000).toISOString(),
          reminderTiming: '24-hours',
          audience: 'Active Users',
          status: 'active',
          createdAt: new Date(Date.now() - 86400000).toISOString(),
        },
        {
          id: 'er_2',
          eventName: 'Flash Sale Tomorrow',
          description: 'Get ready for 50% off selected services',
          scheduledDate: new Date(Date.now() + 86400000).toISOString(),
          reminderTiming: '1-hour',
          audience: 'All Users',
          status: 'active',
          createdAt: new Date(Date.now() - 43200000).toISOString(),
        },
      ];
      setReminders(demoReminders);
      localStorage.setItem('eventReminders', JSON.stringify(demoReminders));
    }
  }, []);

  const handleCreateReminder = () => {
    if (!newEventName.trim() || !newDate.trim()) return;

    const newReminder: EventReminder = {
      id: `er_${Date.now()}`,
      eventName: newEventName,
      description: newDescription,
      scheduledDate: newDate,
      reminderTiming: newTiming,
      audience: 'All Users',
      status: 'active',
      createdAt: new Date().toISOString(),
    };

    const updated = [...reminders, newReminder];
    setReminders(updated);
    localStorage.setItem('eventReminders', JSON.stringify(updated));
    setNewEventName('');
    setNewDescription('');
    setNewDate('');
  };

  return (
    <AdminLayout>
      <div style={{ padding: '16px', background: '#fff' }}>
      <ToastContainer toasts={toasts} onClose={removeToast} />
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#333' }}>
            🎉 Event Reminders
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
          Schedule event reminders and alerts
        </p>
      </div>

      <div style={{ marginBottom: '24px' }}>
        <div style={{ fontSize: '14px', fontWeight: '600', color: '#333', marginBottom: '12px' }}>
          Schedule Event Reminder
        </div>
        <div style={{ display: 'grid', gap: '12px' }}>
          <input
            type="text"
            placeholder="Event name"
            value={newEventName}
            onChange={(e) => setNewEventName(e.target.value)}
            style={{ padding: '10px 12px', border: '2px solid #FFD9B3', borderRadius: '6px', fontSize: '14px' }}
          />
          <input
            type="text"
            placeholder="Description"
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            style={{ padding: '10px 12px', border: '2px solid #FFD9B3', borderRadius: '6px', fontSize: '14px' }}
          />
          <input
            type="datetime-local"
            value={newDate}
            onChange={(e) => setNewDate(e.target.value)}
            style={{ padding: '10px 12px', border: '2px solid #FFD9B3', borderRadius: '6px', fontSize: '14px' }}
          />
          <select
            value={newTiming}
            onChange={(e) => setNewTiming(e.target.value)}
            style={{ padding: '10px 12px', border: '2px solid #FFD9B3', borderRadius: '6px', fontSize: '14px', cursor: 'pointer' }}
          >
            <option value="1-hour">1 hour before</option>
            <option value="24-hours">24 hours before</option>
            <option value="7-days">7 days before</option>
          </select>
          <button
            onClick={handleCreateReminder}
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
            + Schedule Reminder
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gap: '12px' }}>
        {reminders.map(reminder => (
          <div key={reminder.id} style={{
            padding: '16px',
            background: 'white',
            border: '2px solid #FFD9B3',
            borderRadius: '8px',
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '12px', alignItems: 'start', marginBottom: '12px' }}>
              <div>
                <div style={{ fontWeight: '600', color: '#333', marginBottom: '4px' }}>
                  {reminder.eventName}
                </div>
                <div style={{ fontSize: '12px', color: '#666' }}>
                  {reminder.description}
                </div>
              </div>
              <span style={{
                padding: '6px 10px',
                background: '#e8f5e9',
                color: '#2e7d32',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: '600',
                height: 'fit-content',
                whiteSpace: 'nowrap',
              }}>
                ACTIVE
              </span>
            </div>

            <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>
              When: {new Date(reminder.scheduledDate).toLocaleString()} • Remind: {reminder.reminderTiming}
            </div>
            <div style={{ fontSize: '11px', color: '#999' }}>
              Audience: {reminder.audience}
            </div>
          </div>
        ))}
      </div>
      </div>
    </AdminLayout>
  );
}
