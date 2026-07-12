import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface ErrandStatusCardProps {
  errandId: number;
  status: string;
  userRole: 'asker' | 'doer';
  budget?: number;
  deadline?: string;
  doerName?: string;
  askerName?: string;
  rating?: number;
  onStartJob?: () => void;
  onCompleteJob?: () => void;
  onRateWork?: () => void;
  onRequestChanges?: () => void;
  onChat?: () => void;
  onCancel?: () => void;
}

export default function ErrandStatusCard({
  errandId,
  status,
  userRole,
  budget,
  deadline,
  doerName,
  askerName,
  rating,
  onStartJob,
  onCompleteJob,
  onRateWork,
  onRequestChanges,
  onChat,
  onCancel,
}: ErrandStatusCardProps) {
  const [showDetails, setShowDetails] = useState(false);
  const navigate = useNavigate();

  const getStatusConfig = () => {
    // ASKER VIEWS
    if (userRole === 'asker') {
      switch (status) {
        case 'open':
          return {
            icon: '📝',
            title: 'Your Errand is Live',
            subtitle: 'Waiting for offers from doers',
            progress: 'Step 1 of 6',
            whatHappened: ['✅ You posted the errand'],
            whatNext: ['⏳ Doers will submit offers', `📅 Posted ${new Date().toLocaleDateString()}`],
            actions: [
              { label: '💬 Manage Errand', onClick: () => {}, variant: 'secondary' },
            ],
            color: 'blue',
          };
        case 'has_bids':
          return {
            icon: '💰',
            title: 'You Have Offers!',
            subtitle: 'Review and select the best doer',
            progress: 'Step 2 of 6',
            whatHappened: [
              '✅ You posted the errand',
              '💰 You received offers',
            ],
            whatNext: ['⏳ Review offers and select one', '🎯 Compare doers by rating and price'],
            actions: [
              { label: '👥 View All Offers', onClick: () => {}, variant: 'primary' },
            ],
            color: 'yellow',
          };
        case 'confirmed':
          return {
            icon: '⏳',
            title: 'Waiting for Doer Confirmation',
            subtitle: `${doerName} has 24 hours to confirm`,
            progress: 'Step 3 of 6',
            whatHappened: [
              '✅ You posted the errand',
              '✅ You accepted ' + doerName + "'s offer",
            ],
            whatNext: [
              `⏳ ${doerName} has 24h to confirm they can help`,
              '📅 If no response, offer will timeout',
            ],
            actions: [
              { label: '💬 Chat with ' + (doerName || 'Doer'), onClick: onChat, variant: 'secondary' },
            ],
            color: 'orange',
          };
        case 'confirmed_awaiting_start':
          return {
            icon: '🚀',
            title: 'Ready to Start!',
            subtitle: `${doerName} confirmed and is ready`,
            progress: 'Step 4 of 6',
            whatHappened: [
              '✅ You posted the errand',
              `✅ You accepted ${doerName}'s offer`,
              `✅ ${doerName} confirmed they're ready`,
            ],
            whatNext: [
              `⏳ ${doerName} needs to click START JOB`,
              `📅 Deadline: ${deadline || 'TBD'}`,
            ],
            actions: [
              { label: '💬 Chat with ' + (doerName || 'Doer'), onClick: onChat, variant: 'secondary' },
              { label: '❌ Cancel if Needed', onClick: onCancel, variant: 'danger' },
            ],
            color: 'green',
          };
        case 'in_progress':
          return {
            icon: '⏱️',
            title: 'Work in Progress',
            subtitle: `${doerName} is working on your errand`,
            progress: 'Step 5 of 6',
            whatHappened: [
              '✅ Errand was posted',
              `✅ ${doerName} was selected`,
              `✅ ${doerName} started the work`,
            ],
            whatNext: [
              `⏳ ${doerName} is working...`,
              '💬 Stay in touch via chat',
              '📸 Ask for progress updates if needed',
            ],
            actions: [
              { label: '💬 Chat for Updates', onClick: onChat, variant: 'primary' },
            ],
            color: 'blue',
          };
        case 'completed':
          return {
            icon: '✅',
            title: 'Work Completed!',
            subtitle: `${doerName} finished the job`,
            progress: 'Step 6 of 6',
            whatHappened: [
              '✅ Errand was posted',
              `✅ ${doerName} accepted the offer`,
              `✅ ${doerName} completed the work`,
            ],
            whatNext: [
              '⭐ Rate their work (REQUIRED for payment)',
              '⏰ You have 48 hours to review',
              '💰 Payment releases after you rate',
            ],
            timeLeft: '48 hours',
            actions: [
              { label: '⭐ Rate ' + (doerName || 'Doer') + "'s Work", onClick: onRateWork, variant: 'primary' },
              { label: '🔄 Request Changes', onClick: onRequestChanges, variant: 'secondary' },
              { label: '💬 Chat with ' + (doerName || 'Doer'), onClick: onChat, variant: 'tertiary' },
            ],
            color: 'green',
          };
        case 'disputed':
          return {
            icon: '⚠️',
            title: 'Dispute Raised',
            subtitle: 'Admin is reviewing the issue',
            progress: 'Dispute Resolution',
            whatHappened: ['⚠️ A dispute was raised for this errand'],
            whatNext: [
              '🔍 Admin is investigating',
              '⏳ Resolution typically takes 24-48 hours',
              '💬 Provide evidence in chat if needed',
            ],
            actions: [
              { label: '💬 Provide Evidence', onClick: onChat, variant: 'primary' },
            ],
            color: 'red',
          };
        default:
          return null;
      }
    }

    // DOER VIEWS
    if (userRole === 'doer') {
      switch (status) {
        case 'has_bids':
          return {
            icon: '💰',
            title: 'Your Offer is Pending',
            subtitle: `${askerName} is reviewing your offer`,
            progress: 'Waiting for Response',
            whatHappened: ['✅ You submitted an offer of $' + budget],
            whatNext: [
              `⏳ ${askerName} is reviewing your offer`,
              '📬 You\'ll be notified when they decide',
              '💬 You can chat to pitch yourself',
            ],
            actions: [
              { label: '💬 Chat with ' + (askerName || 'Asker'), onClick: onChat, variant: 'secondary' },
            ],
            color: 'blue',
          };
        case 'confirmed':
          return {
            icon: '✅',
            title: 'Offer Accepted!',
            subtitle: `${askerName} selected your offer`,
            progress: 'Step 2 of 5',
            whatHappened: [
              '✅ You submitted offer of $' + budget,
              `✅ ${askerName} accepted your offer`,
            ],
            whatNext: [
              '✅ You have 24 hours to confirm',
              'Click CONFIRM READY to proceed',
              '⏰ If no response, offer will timeout',
            ],
            actions: [
              { label: '✅ I\'m Ready to Help', onClick: onStartJob, variant: 'primary' },
              { label: '❌ Cancel Offer', onClick: onCancel, variant: 'danger' },
            ],
            color: 'green',
          };
        case 'confirmed_awaiting_start':
          return {
            icon: '🚀',
            title: 'Start the Work!',
            subtitle: `${askerName} is waiting for you to begin`,
            progress: 'Step 3 of 5',
            whatHappened: [
              '✅ Your offer was accepted',
              '✅ You confirmed you\'re ready',
            ],
            whatNext: [
              '🚀 Click START JOB to begin',
              `📅 Deadline: ${deadline || 'TBD'}`,
              '⏳ Timer will start counting',
            ],
            actions: [
              { label: '🚀 Start Job', onClick: onStartJob, variant: 'primary' },
            ],
            color: 'orange',
          };
        case 'in_progress':
          return {
            icon: '⏱️',
            title: 'You\'re Working!',
            subtitle: 'Timer is running, stay focused',
            progress: 'Step 4 of 5',
            whatHappened: [
              '✅ Offer accepted',
              '✅ You confirmed ready',
              '✅ Work started',
            ],
            whatNext: [
              '✏️ Complete the work',
              '📸 Take photos/videos as proof',
              '✅ Click COMPLETE when done',
            ],
            actions: [
              { label: '✅ Mark as Complete', onClick: onCompleteJob, variant: 'primary' },
              { label: '💬 Chat for Help', onClick: onChat, variant: 'secondary' },
            ],
            color: 'blue',
          };
        case 'completed':
          return {
            icon: '⏳',
            title: 'Waiting for Review',
            subtitle: `${askerName} is reviewing your work`,
            progress: 'Step 5 of 5',
            whatHappened: [
              '✅ Work completed and submitted',
              '📸 Proof of completion uploaded',
            ],
            whatNext: [
              `⏳ ${askerName} has 48 hours to review`,
              '⭐ They will rate your work',
              '💰 Payment releases after rating',
            ],
            timeLeft: '48 hours',
            actions: [
              { label: '💬 Follow Up', onClick: onChat, variant: 'secondary' },
            ],
            color: 'green',
          };
        case 'disputed':
          return {
            icon: '⚠️',
            title: 'Dispute Raised',
            subtitle: `${askerName} disputed the work`,
            progress: 'Dispute Resolution',
            whatHappened: ['⚠️ A dispute was raised'],
            whatNext: [
              '🔍 Admin is investigating',
              '💬 Respond to asker\'s concerns in chat',
              '📸 Provide evidence if needed',
            ],
            actions: [
              { label: '💬 Respond in Chat', onClick: onChat, variant: 'primary' },
            ],
            color: 'red',
          };
        default:
          return null;
      }
    }

    return null;
  };

  const config = getStatusConfig();
  if (!config) return null;

  const bgColor = {
    blue: 'bg-blue-50 border-blue-200',
    yellow: 'bg-yellow-50 border-yellow-200',
    orange: 'bg-orange-50 border-orange-200',
    green: 'bg-green-50 border-green-200',
    red: 'bg-red-50 border-red-200',
  }[config.color];

  const textColor = {
    blue: 'text-blue-900',
    yellow: 'text-yellow-900',
    orange: 'text-orange-900',
    green: 'text-green-900',
    red: 'text-red-900',
  }[config.color];

  const accentColor = {
    blue: 'border-blue-300',
    yellow: 'border-yellow-300',
    orange: 'border-orange-300',
    green: 'border-green-300',
    red: 'border-red-300',
  }[config.color];

  return (
    <div className={`border-2 ${accentColor} rounded-lg p-5 ${bgColor} mb-6`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-3xl">{config.icon}</span>
            <div>
              <h2 className={`text-xl font-bold ${textColor}`}>{config.title}</h2>
              <p className={`text-sm ${textColor} opacity-75`}>{config.subtitle}</p>
            </div>
          </div>
          <p className="text-xs text-gray-600 font-semibold">{config.progress}</p>
        </div>
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="text-gray-500 hover:text-gray-700 text-2xl"
        >
          {showDetails ? '▼' : '▶'}
        </button>
      </div>

      {/* Details Section */}
      {showDetails && (
        <div className="border-t-2 border-gray-200 pt-4">
          {/* What's Happened */}
          <div className="mb-4">
            <h3 className="font-bold text-sm mb-2">📋 What's Happened:</h3>
            <ul className="space-y-1">
              {config.whatHappened.map((item, idx) => (
                <li key={idx} className="text-sm text-gray-700">
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* What's Next */}
          <div className="mb-4">
            <h3 className="font-bold text-sm mb-2">👉 What's Next:</h3>
            <ul className="space-y-1">
              {config.whatNext.map((item, idx) => (
                <li key={idx} className="text-sm text-gray-700">
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Time Left Warning */}
          {config.timeLeft && (
            <div className="bg-red-100 border border-red-300 rounded p-2 mb-4">
              <p className="text-sm font-bold text-red-900">
                ⏰ Time left: {config.timeLeft}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col gap-2">
        {config.actions.map((action, idx) => {
          const btnVariant = {
            primary: 'bg-errandify-orange text-white hover:bg-orange-600',
            secondary: 'bg-blue-500 text-white hover:bg-blue-600',
            tertiary: 'bg-gray-300 text-gray-800 hover:bg-gray-400',
            danger: 'bg-red-500 text-white hover:bg-red-600',
          }[action.variant];

          return (
            <button
              key={idx}
              onClick={action.onClick}
              className={`w-full py-2 px-3 rounded-lg font-semibold text-sm transition ${btnVariant}`}
            >
              {action.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
