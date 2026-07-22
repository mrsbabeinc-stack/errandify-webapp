import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

interface EmailSettings {
  enabled: boolean;
  digestFrequency: 'immediate' | 'daily' | 'weekly';
  notificationTypes: {
    bid_accepted: boolean;
    task_completed: boolean;
    payment_released: boolean;
    new_bid_received: boolean;
    message_received: boolean;
    review_received: boolean;
    task_cancelled: boolean;
    dispute_opened: boolean;
  };
}

export default function EmailNotificationSettingsPage() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<EmailSettings>({
    enabled: true,
    digestFrequency: 'daily',
    notificationTypes: {
      bid_accepted: true,
      task_completed: true,
      payment_released: true,
      new_bid_received: true,
      message_received: false,
      review_received: true,
      task_cancelled: true,
      dispute_opened: true,
    },
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/user/email-settings`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        }
      );
      setSettings(response.data.data || settings);
    } catch (err) {
      console.error('Failed to fetch settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.patch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/user/email-settings`,
        settings,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        }
      );
      setMessage({ type: 'success', text: '✅ Email settings saved!' });
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      setMessage({ type: 'error', text: '❌ Failed to save settings' });
    } finally {
      setSaving(false);
    }
  };

  const toggleNotificationType = (key: keyof EmailSettings['notificationTypes']) => {
    setSettings(prev => ({
      ...prev,
      notificationTypes: {
        ...prev.notificationTypes,
        [key]: !prev.notificationTypes[key],
      },
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-errandify-bg px-4 py-4">
        <p className="text-center py-12 text-gray-600">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-errandify-bg px-4 py-4 pb-20">
      <div className="max-w-2xl mx-auto">
        <button onClick={() => navigate(-1)} className="mb-4 text-lg text-gray-600 font-bold">‹ Back</button>
        <h1 className="text-2xl font-bold text-errandify-brown mb-2">📧 Email Notifications</h1>
        <p className="text-sm text-gray-600 mb-6">Customize how we send you updates</p>

        {message && (
          <div
            className={`mb-4 p-3 rounded-lg text-sm ${
              message.type === 'success'
                ? 'bg-green-50 border border-green-200 text-green-800'
                : 'bg-red-50 border border-red-200 text-red-800'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Master Toggle */}
        <div className="bg-white rounded-lg p-4 mb-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-gray-800">Email Notifications</p>
              <p className="text-xs text-gray-600 mt-1">Receive important updates via email</p>
            </div>
            <button
              onClick={() => setSettings(prev => ({ ...prev, enabled: !prev.enabled }))}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.enabled ? 'bg-green-500' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                  settings.enabled ? 'translate-x-5' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </div>

        {settings.enabled && (
          <>
            {/* Digest Frequency */}
            <div className="bg-white rounded-lg p-4 mb-6 border border-gray-200">
              <p className="font-semibold text-gray-800 mb-4">📨 Digest Frequency</p>
              <div className="space-y-2">
                {(['immediate', 'daily', 'weekly'] as const).map(freq => (
                  <label key={freq} className="flex items-center p-3 hover:bg-gray-50 rounded-lg cursor-pointer">
                    <input
                      type="radio"
                      name="frequency"
                      value={freq}
                      checked={settings.digestFrequency === freq}
                      onChange={() => setSettings(prev => ({ ...prev, digestFrequency: freq }))}
                      className="w-4 h-4"
                    />
                    <span className="ml-3 text-sm font-medium text-gray-700 flex-1">
                      {freq === 'immediate' ? '⚡ Immediate' : freq === 'daily' ? '📅 Daily Digest' : '📆 Weekly Digest'}
                    </span>
                    <span className="text-xs text-gray-500">
                      {freq === 'immediate' ? '(Real-time alerts)' : freq === 'daily' ? '(Morning summary)' : '(Sunday evening)'}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Critical Notifications */}
            <div className="bg-white rounded-lg p-4 mb-6 border border-gray-200">
              <div className="bg-gradient-to-r from-red-500 to-red-600 text-white p-3 rounded-lg mb-4">
                <p className="font-bold text-sm">🔴 Critical Events (Always Sent)</p>
              </div>
              <div className="space-y-3">
                {[
                  { key: 'bid_accepted', label: 'Offer Accepted', icon: '✅' },
                  { key: 'payment_released', label: 'Payment Released', icon: '💰' },
                  { key: 'dispute_opened', label: 'Dispute Opened', icon: '⚠️' },
                ].map(item => (
                  <div key={item.key} className="flex items-center p-3 bg-gray-50 rounded-lg">
                    <span className="text-lg">{item.icon}</span>
                    <span className="ml-3 text-sm font-medium text-gray-700 flex-1">{item.label}</span>
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">Always</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Important Notifications */}
            <div className="bg-white rounded-lg p-4 mb-6 border border-gray-200">
              <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-white p-3 rounded-lg mb-4">
                <p className="font-bold text-sm">🟡 Important Events (Customizable)</p>
              </div>
              <div className="space-y-3">
                {[
                  { key: 'task_completed', label: 'Errand Completed', icon: '🏁' },
                  { key: 'new_bid_received', label: 'New Offer Received', icon: '💪' },
                  { key: 'review_received', label: 'Review Received', icon: '⭐' },
                  { key: 'task_cancelled', label: 'Errand Cancelled', icon: '❌' },
                ].map(item => (
                  <button
                    key={item.key}
                    onClick={() => toggleNotificationType(item.key as any)}
                    className="w-full flex items-center p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition"
                  >
                    <span className="text-lg">{item.icon}</span>
                    <span className="ml-3 text-sm font-medium text-gray-700 flex-1 text-left">{item.label}</span>
                    <span
                      className={`text-xs px-3 py-1 rounded-full font-semibold ${
                        settings.notificationTypes[item.key as any]
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {settings.notificationTypes[item.key as any] ? 'On' : 'Off'}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Optional Notifications */}
            <div className="bg-white rounded-lg p-4 mb-6 border border-gray-200">
              <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-3 rounded-lg mb-4">
                <p className="font-bold text-sm">🟢 Optional Events</p>
              </div>
              <div className="space-y-3">
                {[
                  { key: 'message_received', label: 'Message Received', icon: '💬' },
                ].map(item => (
                  <button
                    key={item.key}
                    onClick={() => toggleNotificationType(item.key as any)}
                    className="w-full flex items-center p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition"
                  >
                    <span className="text-lg">{item.icon}</span>
                    <span className="ml-3 text-sm font-medium text-gray-700 flex-1 text-left">{item.label}</span>
                    <span
                      className={`text-xs px-3 py-1 rounded-full font-semibold ${
                        settings.notificationTypes[item.key as any]
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {settings.notificationTypes[item.key as any] ? 'On' : 'Off'}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Save Button */}
        <div className="flex gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 bg-errandify-orange text-white py-3 rounded-lg font-bold hover:bg-opacity-90 disabled:opacity-50 transition"
          >
            {saving ? '⏳ Saving...' : '💾 Save Settings'}
          </button>
        </div>

        {/* Info */}
        <div className="mt-6 p-4 bg-orange-50 rounded-lg border border-errandify-orange-200">
          <p className="text-xs text-errandify-orange-900">
            <strong>💡 Tip:</strong> Critical events are always sent immediately. Important events follow your digest schedule. Optional events can be toggled on/off.
          </p>
        </div>
      </div>
    </div>
  );
}
