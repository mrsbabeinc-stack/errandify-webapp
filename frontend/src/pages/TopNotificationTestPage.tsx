import React from 'react';
import { showSuccess, showError, showWarning, showInfo } from '../utils/topNotification';
import '../styles/TestPage.css';

const TopNotificationTestPage: React.FC = () => {
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 20px' }}>
      <h1>🔔 Top Notification Test Page</h1>
      <p style={{ color: '#666', marginBottom: '30px' }}>
        Click any button below to test the top notification bar. Notifications appear at the top-center of the screen.
      </p>

      <section style={{ marginBottom: '40px' }}>
        <h2>✅ Success Notifications</h2>
        <div style={{ display: 'grid', gap: '10px' }}>
          <button
            onClick={() => showSuccess('Profile updated successfully!')}
            style={{
              padding: '12px 20px',
              background: '#27AE60',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
            }}
          >
            Profile Updated
          </button>
          <button
            onClick={() => showSuccess('✓ File uploaded successfully!', '✓', 3000)}
            style={{
              padding: '12px 20px',
              background: '#27AE60',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
            }}
          >
            File Uploaded
          </button>
          <button
            onClick={() => showSuccess('Leave request submitted for Jordan Smith on 2026-07-15')}
            style={{
              padding: '12px 20px',
              background: '#27AE60',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
            }}
          >
            Leave Request Submitted
          </button>
          <button
            onClick={() => showSuccess('Changes saved and published', '✓', 4000)}
            style={{
              padding: '12px 20px',
              background: '#27AE60',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
            }}
          >
            Changes Published
          </button>
        </div>
      </section>

      <section style={{ marginBottom: '40px' }}>
        <h2>❌ Error Notifications</h2>
        <div style={{ display: 'grid', gap: '10px' }}>
          <button
            onClick={() => showError('Failed to update profile. Please try again.')}
            style={{
              padding: '12px 20px',
              background: '#E74C3C',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
            }}
          >
            Update Failed
          </button>
          <button
            onClick={() => showError('⚠️ Jordan Smith has no full day leaves remaining', '✗')}
            style={{
              padding: '12px 20px',
              background: '#E74C3C',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
            }}
          >
            Insufficient Balance
          </button>
          <button
            onClick={() => showError('Network error. Please check your connection.', '✗', 5000)}
            style={{
              padding: '12px 20px',
              background: '#E74C3C',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
            }}
          >
            Network Error
          </button>
          <button
            onClick={() => showError('File upload failed. Maximum size is 5MB.')}
            style={{
              padding: '12px 20px',
              background: '#E74C3C',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
            }}
          >
            File Too Large
          </button>
        </div>
      </section>

      <section style={{ marginBottom: '40px' }}>
        <h2>⚠️ Warning Notifications</h2>
        <div style={{ display: 'grid', gap: '10px' }}>
          <button
            onClick={() => showWarning('Leave request rejected. Balance refunded.', '⚠️')}
            style={{
              padding: '12px 20px',
              background: '#F39C12',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
            }}
          >
            Leave Rejected
          </button>
          <button
            onClick={() => showWarning('Your subscription expires in 7 days', '⚠️', 4000)}
            style={{
              padding: '12px 20px',
              background: '#F39C12',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
            }}
          >
            Expiring Soon
          </button>
          <button
            onClick={() => showWarning('This action cannot be undone', '⚠️')}
            style={{
              padding: '12px 20px',
              background: '#F39C12',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
            }}
          >
            Confirm Action
          </button>
          <button
            onClick={() => showWarning('You have low wallet balance', '⚠️', 4000)}
            style={{
              padding: '12px 20px',
              background: '#F39C12',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
            }}
          >
            Low Balance
          </button>
        </div>
      </section>

      <section>
        <h2>ℹ️ Info Notifications</h2>
        <div style={{ display: 'grid', gap: '10px' }}>
          <button
            onClick={() => showInfo('New message from Jordan Smith', 'ℹ️')}
            style={{
              padding: '12px 20px',
              background: '#2196F3',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
            }}
          >
            New Message
          </button>
          <button
            onClick={() => showInfo('Processing your request...', 'ℹ️', 3000)}
            style={{
              padding: '12px 20px',
              background: '#2196F3',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
            }}
          >
            Processing
          </button>
          <button
            onClick={() => showInfo('💡 Try submitting a leave request to see more notifications', 'ℹ️', 5000)}
            style={{
              padding: '12px 20px',
              background: '#2196F3',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
            }}
          >
            Hint
          </button>
          <button
            onClick={() => showInfo('Welcome back! You have 3 pending leave requests', 'ℹ️')}
            style={{
              padding: '12px 20px',
              background: '#2196F3',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
            }}
          >
            Welcome
          </button>
        </div>
      </section>

      <section style={{ marginTop: '40px', padding: '20px', background: '#f0f0f0', borderRadius: '8px' }}>
        <h3>📖 How It Works</h3>
        <p>The top notification bar appears at the top-center of the screen with a smooth slide-down animation.</p>
        <ul style={{ marginLeft: '20px', lineHeight: '1.8' }}>
          <li>Each notification auto-dismisses after a few seconds</li>
          <li>Click the ✕ button to dismiss immediately</li>
          <li>Use different types for different scenarios (success, error, warning, info)</li>
          <li>Notifications are visible across the entire application</li>
        </ul>

        <h3 style={{ marginTop: '20px' }}>💻 Usage in Code</h3>
        <pre
          style={{
            background: '#333',
            color: '#0f0',
            padding: '15px',
            borderRadius: '6px',
            overflow: 'auto',
            fontSize: '12px',
          }}
        >
{`import { showSuccess, showError, showWarning, showInfo } from '@/utils/topNotification';

// Show success notification
showSuccess('Profile updated!');

// Show error notification
showError('Failed to upload file');

// Show warning notification
showWarning('Leave rejected');

// Show info notification
showInfo('New message received');

// Use window.topNotification directly
window.topNotification?.({
  type: 'success',
  message: 'Done!',
  icon: '✓',
  duration: 4000
});`}
        </pre>
      </section>
    </div>
  );
};

export default TopNotificationTestPage;
