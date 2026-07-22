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
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/users/preferences`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success && response.data.data?.notification_preferences) {
        const fetchedPrefs = response.data.data.notification_preferences;
        // Merge with defaults to ensure all keys exist
        setPreferences({
          ...DEFAULT_PREFERENCES,
          ...fetchedPrefs,
        });
      } else {
        // Use defaults if no data returned
        setPreferences(DEFAULT_PREFERENCES);
      }
    } catch (err) {
      console.error('Failed to fetch preferences:', err);
      // Use defaults on error
      setPreferences(DEFAULT_PREFERENCES);
      setMessage({ type: 'error', text: '⚠️ Using default preferences (could not load saved ones)' });
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
        setTimeout(() => setMessage(null), 3000);
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
      <div className="flex items-center justify-center py-8">
        <p className="text-gray-600">Loading preferences...</p>
      </div>
    );
  }

  const renderEventToggle = (key: keyof NotificationPreferences, label: string, description: string, isCritical = false) => (
    <div key={key} className="flex items-center justify-between p-4 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 transition">
      <div className="flex-1">
        <p className="text-sm font-semibold text-gray-800">{label}</p>
        <p className="text-xs text-gray-500 mt-0.5">{description}</p>
      </div>
      <button
        onClick={() => handleToggle(key)}
        disabled={isCritical}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ml-4 ${
          preferences[key] ? 'bg-green-500' : 'bg-gray-300'
        } ${isCritical ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
            preferences[key] ? 'translate-x-5' : 'translate-x-0.5'
          }`}
        />
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-errandify-orange-50 to-indigo-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">🔔 Notification Preferences</h1>
          <p className="text-gray-600">Customize which notifications you want to receive</p>
        </div>

        {/* Message Alert */}
        {message && (
          <div
            className={`mb-6 p-4 rounded-lg border ${
              message.type === 'success'
                ? 'bg-green-50 border-green-200 text-green-800'
                : 'bg-red-50 border-red-200 text-red-800'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* All Notifications in One Card */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-6">
          {/* Critical Section */}
          <div className="border-b-2 border-red-100 bg-red-50/30">
            <div className="px-6 py-4 bg-gradient-to-r from-red-500 to-red-600 text-white">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <span>🔴</span>
                <span>Critical Events (Always Enabled)</span>
              </h2>
              <p className="text-sm text-red-100 mt-1">Essential notifications that keep your business running</p>
            </div>
            <div className="divide-y divide-gray-100">
              {renderEventToggle('bid_accepted', 'Offer Confirmed', 'When someone confirms your offer', true)}
              {renderEventToggle('task_reopened', 'Errand Reopened', 'When an errand you offer on becomes available again', true)}
              {renderEventToggle('payment_released', 'Payment Released', 'When payment is released for completed work', true)}
            </div>
          </div>

          {/* Medium Section */}
          <div className="border-b-2 border-yellow-100 bg-yellow-50/30">
            <div className="px-6 py-4 bg-gradient-to-r from-yellow-500 to-yellow-600 text-white">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <span>🟡</span>
                <span>Important Events</span>
              </h2>
              <p className="text-sm text-yellow-100 mt-1">Keep track of errand activity and interactions</p>
            </div>
            <div className="divide-y divide-gray-100">
              {renderEventToggle('new_bid_received', 'New Offer Received', 'When you receive a new offer on your errand')}
              {renderEventToggle('message_received', 'Message Received', 'When someone sends you a message')}
              {renderEventToggle('task_completed', 'Errand Completed', 'When an errand you posted is completed')}
              {renderEventToggle('review_received', 'Review Received', 'When someone leaves you a review or rating')}
              {renderEventToggle('bid_rejected', 'Offer Declined', 'When your offer is declined')}
            </div>
          </div>

          {/* Low Section */}
          <div className="bg-green-50/30">
            <div className="px-6 py-4 bg-gradient-to-r from-green-500 to-green-600 text-white">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <span>🟢</span>
                <span>Optional Notifications</span>
              </h2>
              <p className="text-sm text-green-100 mt-1">Nice-to-know updates and community highlights</p>
            </div>
            <div className="divide-y divide-gray-100">
              {renderEventToggle('profile_viewed', 'Profile Viewed', 'When someone views your profile')}
              {renderEventToggle('referral_activity', 'Referral Activity', 'Updates about your referrals')}
              {renderEventToggle('platform_updates', 'Platform Updates', 'News and announcements from Errandify')}
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 px-6 py-4 bg-gradient-to-r from-errandify-orange to-orange-600 text-white rounded-xl font-bold hover:shadow-lg disabled:opacity-50 transition transform hover:scale-105"
          >
            {saving ? '⏳ Saving...' : '💾 Save Preferences'}
          </button>
        </div>

        {/* Info Footer */}
        <div className="mt-8 p-4 bg-orange-50 rounded-lg border border-errandify-orange-200">
          <p className="text-sm text-errandify-orange-900">
            <strong>💡 Tip:</strong> Critical notifications cannot be disabled because they're essential for managing your errands and payments. You can customize all other notifications to suit your preferences.
          </p>
        </div>
      </div>
    </div>
  );
}
