import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

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

export default function NotificationPreferencesPage() {
  const navigate = useNavigate();
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
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/users/preferences`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success && response.data.data?.notification_preferences) {
        const fetchedPrefs = response.data.data.notification_preferences;
        setPreferences({
          ...DEFAULT_PREFERENCES,
          ...fetchedPrefs,
        });
      } else {
        setPreferences(DEFAULT_PREFERENCES);
      }
    } catch (err) {
      console.error('Failed to fetch preferences:', err);
      setPreferences(DEFAULT_PREFERENCES);
      setMessage({ type: 'error', text: '⚠️ Using default preferences' });
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (key: keyof NotificationPreferences) => {
    if (CRITICAL_EVENTS.includes(key)) {
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
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/users/preferences`,
        { notification_preferences: preferences },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        setMessage({ type: 'success', text: '✅ Preferences saved successfully!' });
        setTimeout(() => {
          navigate(-1);
        }, 1500);
      }
    } catch (err) {
      console.error('Failed to save preferences:', err);
      setMessage({ type: 'error', text: '❌ Failed to save preferences' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-errandify-orange-50 to-indigo-50 flex items-center justify-center">
        <p className="text-gray-600">Loading preferences...</p>
      </div>
    );
  }

  const renderEventToggle = (key: keyof NotificationPreferences, label: string, isCritical = false) => (
    <div key={key} className="flex items-center justify-between px-3 py-1.5 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 transition">
      <p className="text-xs font-semibold text-gray-800">{label}</p>
      <button
        onClick={() => handleToggle(key)}
        disabled={isCritical}
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
          preferences[key] ? 'bg-green-500' : 'bg-gray-300'
        } ${isCritical ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            preferences[key] ? 'translate-x-4' : 'translate-x-0.5'
          }`}
        />
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-errandify-orange-50 to-indigo-50 py-4 px-3 pb-32">
      <div className="max-w-3xl mx-auto">
        {/* Header - Compact */}
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => navigate(-1)}
            className="text-errandify-orange hover:text-orange-700 font-semibold"
          >
            ←
          </button>
          <h1 className="text-xl font-bold text-gray-800">🔔 Notification Preferences</h1>
          <div className="w-6" />
        </div>

        {/* Message Alert */}
        {message && (
          <div
            className={`mb-2 p-2 rounded text-xs font-semibold border ${
              message.type === 'success'
                ? 'bg-green-50 border-green-200 text-green-800'
                : 'bg-red-50 border-red-200 text-red-800'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* All Notifications in Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-3">
          {/* Critical Section */}
          <div className="bg-white rounded shadow overflow-hidden border border-red-200">
            <div className="px-3 py-2 bg-red-500 text-white">
              <h2 className="text-xs font-bold">🔴 Critical (Always On)</h2>
            </div>
            <div className="divide-y divide-gray-100">
              {renderEventToggle('bid_accepted', '✓ Offer Confirmed', true)}
              {renderEventToggle('task_reopened', '✓ Errand Reopened', true)}
              {renderEventToggle('payment_released', '✓ Payment Released', true)}
            </div>
          </div>

          {/* Important Section */}
          <div className="bg-white rounded shadow overflow-hidden border border-yellow-200">
            <div className="px-3 py-2 bg-yellow-500 text-white">
              <h2 className="text-xs font-bold">🟡 Important</h2>
            </div>
            <div className="divide-y divide-gray-100">
              {renderEventToggle('new_bid_received', 'New Offer')}
              {renderEventToggle('message_received', 'Message')}
              {renderEventToggle('task_completed', 'Errand Done')}
              {renderEventToggle('review_received', 'Review')}
              {renderEventToggle('bid_rejected', 'Offer Declined')}
            </div>
          </div>

          {/* Optional Section */}
          <div className="bg-white rounded shadow overflow-hidden border border-green-200">
            <div className="px-3 py-2 bg-green-500 text-white">
              <h2 className="text-xs font-bold">🟢 Optional</h2>
            </div>
            <div className="divide-y divide-gray-100">
              {renderEventToggle('profile_viewed', 'Profile Viewed')}
              {renderEventToggle('referral_activity', 'Referral')}
              {renderEventToggle('platform_updates', 'Updates')}
            </div>
          </div>
        </div>

        {/* Save Button - Compact */}
        <div className="flex gap-2">
          <button
            onClick={() => navigate(-1)}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded font-semibold text-sm hover:bg-gray-50 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 px-4 py-2 bg-gradient-to-r from-errandify-orange to-orange-600 text-white rounded font-semibold text-sm hover:shadow-lg disabled:opacity-50 transition"
          >
            {saving ? '⏳ Saving...' : '💾 Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
