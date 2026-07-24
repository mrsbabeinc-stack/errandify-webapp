import React from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import { useErrandifyToast } from '../../utils/errandifyToast';

export const NotificationSystemTest: React.FC = () => {
  const { success, error, warning, info, custom } = useErrandifyToast();

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">🔔 Notification System Test</h1>
          <p className="text-gray-600">Test all Errandify-themed toast notifications</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            {/* Success Toast */}
            <button
              onClick={() => success(
                'Success!',
                'This is a success notification with the Errandify theme'
              )}
              className="px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg font-semibold transition"
            >
              ✓ Show Success Toast
            </button>

            {/* Error Toast */}
            <button
              onClick={() => error(
                'Error Occurred',
                'This is an error notification - something went wrong'
              )}
              className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold transition"
            >
              ✕ Show Error Toast
            </button>

            {/* Warning Toast */}
            <button
              onClick={() => warning(
                'Warning',
                'This is a warning notification - be careful with this action'
              )}
              className="px-6 py-3 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg font-semibold transition"
            >
              ⚠ Show Warning Toast
            </button>

            {/* Info Toast */}
            <button
              onClick={() => info(
                'Information',
                'This is an info notification - just letting you know something'
              )}
              className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-semibold transition"
            >
              ℹ Show Info Toast
            </button>

            {/* Custom Toast */}
            <button
              onClick={() => custom({
                title: 'Custom Notification',
                body: 'This is a custom notification with specific styling and longer duration',
                type: 'info',
                icon: '🎯',
                duration: 8000,
                actionLabel: 'View Details',
                actionUrl: '/admin/dashboard',
              })}
              className="px-6 py-3 bg-rose-500 hover:bg-rose-600 text-white rounded-lg font-semibold transition"
            >
              🎯 Show Custom Toast
            </button>

            {/* Bulk Test */}
            <button
              onClick={() => {
                success('First notification', 'This is the first in a sequence');
                setTimeout(() => error('Second notification', 'This is the second'), 500);
                setTimeout(() => warning('Third notification', 'This is the third'), 1000);
                setTimeout(() => info('Fourth notification', 'This is the fourth'), 1500);
              }}
              className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-semibold transition"
            >
              📢 Show Multiple Toasts
            </button>
          </div>

          {/* Documentation */}
          <div className="border-t pt-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">📋 Implementation Guide</h2>
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-2">Using in React Components:</h3>
                <pre className="bg-gray-900 text-green-400 p-3 rounded text-sm overflow-x-auto">
{`import { useErrandifyToast } from '@/utils/errandifyToast';

export const MyComponent = () => {
  const { success, error, warning, info } = useErrandifyToast();

  const handleSave = () => {
    success('Saved', 'Changes saved successfully');
  };

  return <button onClick={handleSave}>Save</button>;
};`}
                </pre>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-2">Toast Types & Duration:</h3>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li>✓ <strong>success(title, body)</strong> - 5 seconds (green theme)</li>
                  <li>✕ <strong>error(title, body)</strong> - 7 seconds (red theme)</li>
                  <li>⚠ <strong>warning(title, body)</strong> - 6 seconds (yellow theme)</li>
                  <li>ℹ <strong>info(title, body)</strong> - 5 seconds (blue theme)</li>
                  <li>🎯 <strong>custom(options)</strong> - custom duration & styling</li>
                </ul>
              </div>

              <div className="bg-orange-50 border border-orange-200 p-4 rounded-lg">
                <p className="text-sm text-orange-900">
                  <strong>✓ All toasts are:</strong>
                  <br />
                  • Errandify-themed with orange accent colors
                  <br />
                  • Mobile-responsive with smooth animations
                  <br />
                  • Auto-dismissing with manual close button
                  <br />
                  • Stacked vertically with smooth appearance
                  <br />
                  • Supporting title + body + optional actions
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default NotificationSystemTest;
