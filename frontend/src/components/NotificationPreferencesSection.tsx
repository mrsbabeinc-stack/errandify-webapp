import { useState, useEffect } from 'react';
import axios from 'axios';

interface NotificationPreferences {
  bid_accepted: boolean;
  task_reopened: boolean;
  payment_released: boolean;
  new_bid_received: boolean;
  bid_rejected: boolean;
  message_received: boolean;
  task_completed: boolean;
  review_received: boolean;
  profile_viewed: boolean;
  referral_activity: boolean;
  platform_updates: boolean;
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  bid_accepted: true,
  task_reopened: true,
  payment_released: true,
  new_bid_received: true,
  bid_rejected: false,
  message_received: true,
  task_completed: true,
  review_received: true,
  profile_viewed: false,
  referral_activity: false,
  platform_updates: false,
};

const CRITICAL_EVENTS = ['bid_accepted', 'task_reopened', 'payment_released'];
const MEDIUM_EVENTS = ['new_bid_received', 'bid_rejected', 'message_received', 'task_completed', 'review_received'];
const LOW_EVENTS = ['profile_viewed', 'referral_activity', 'platform_updates'];

export default function NotificationPreferencesSection() {
  const [preferences, setPreferences] = useState<NotificationPreferences>(DEFAULT_PREFERENCES);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchPreferences();
  }, []);

  const fetchPreferences = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/user/preferences`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success && response.data.data?.notification_preferences) {
        setPreferences({
          ...DEFAULT_PREFERENCES,
          ...response.data.data.notification_preferences,
        });
      }
    } catch (err) {
      console.error('Failed to fetch preferences:', err);
      setMessage({ type: 'error', text: 'Failed to load preferences' });
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (key: keyof NotificationPreferences) => {
    // Don't allow disabling critical events
    if (CRITICAL_EVENTS.includes(key)) {
      setMessage({ type: 'error', text: 'Critical notifications cannot be disabled' });
      return;
    }

    setPreferences((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.patch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/user/preferences`,
        { notification_preferences: preferences },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        setMessage({ type: 'success', text: 'Preferences saved successfully!' });
      }
    } catch (err) {
      console.error('Failed to save preferences:', err);
      setMessage({ type: 'error', text: 'Failed to save preferences' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-gray-600">Loading preferences...</p>;
  }

  const renderEventToggle = (key: keyof NotificationPreferences, label: string, isCritical = false) => (
    <label key={key} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer">
      <input
        type="checkbox"
        checked={preferences[key]}
        onChange={() => handleToggle(key)}
        disabled={isCritical}
        className={`w-5 h-5 rounded ${isCritical ? 'cursor-not-allowed opacity-50' : ''}`}
      />
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-800">{label}</p>
        {isCritical && <p className="text-xs text-gray-500">Always enabled</p>}
      </div>
    </label>
  );

  return (
    <div className="space-y-6">
      {message && (
        <div
          className={`p-4 rounded-lg ${
            message.type === 'success'
              ? 'bg-green-50 border border-green-200 text-green-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Critical Events */}
      <div>
        <h3 className="text-lg font-bold text-gray-800 mb-3">🔴 Critical Events (Always Enabled)</h3>
        <p className="text-sm text-gray-600 mb-4">These important notifications cannot be disabled</p>
        <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
          {renderEventToggle('bid_accepted', 'Bid Accepted', true)}
          {renderEventToggle('task_reopened', 'Task Reopened', true)}
          {renderEventToggle('payment_released', 'Payment Released', true)}
        </div>
      </div>

      {/* Medium Events */}
      <div>
        <h3 className="text-lg font-bold text-gray-800 mb-3">🟡 Important Events</h3>
        <p className="text-sm text-gray-600 mb-4">Toggle these notifications on or off</p>
        <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
          {renderEventToggle('new_bid_received', 'New Bid Received')}
          {renderEventToggle('bid_rejected', 'Bid Rejected')}
          {renderEventToggle('message_received', 'Message Received')}
          {renderEventToggle('task_completed', 'Task Completed')}
          {renderEventToggle('review_received', 'Review Received')}
        </div>
      </div>

      {/* Low Events */}
      <div>
        <h3 className="text-lg font-bold text-gray-800 mb-3">🟢 Optional Notifications</h3>
        <p className="text-sm text-gray-600 mb-4">Nice-to-know updates</p>
        <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
          {renderEventToggle('profile_viewed', 'Profile Viewed')}
          {renderEventToggle('referral_activity', 'Referral Activity')}
          {renderEventToggle('platform_updates', 'Platform Updates')}
        </div>
      </div>

      {/* Save Button */}
      <div className="flex gap-3 pt-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 px-6 py-3 bg-errandify-orange text-white rounded-lg font-bold hover:bg-opacity-90 disabled:opacity-50 transition"
        >
          {saving ? '💾 Saving...' : '💾 Save Preferences'}
        </button>
      </div>
    </div>
  );
}
