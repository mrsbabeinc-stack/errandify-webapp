import { useState } from 'react';
import CannotCompleteModal from '../components/CannotCompleteModal';
import JobNotCompletedModal from '../components/JobNotCompletedModal';
import DisputeReviewPanel from '../components/DisputeReviewPanel';

type ViewMode = 'doer' | 'asker' | 'admin';

export default function TestCannotComplete() {
  const [viewMode, setViewMode] = useState<ViewMode>('doer');
  const [showDoerModal, setShowDoerModal] = useState(false);
  const [showAskerModal, setShowAskerModal] = useState(false);
  const [submittedDispute, setSubmittedDispute] = useState<any>(null);
  const [disputeType, setDisputeType] = useState<'doer' | 'asker'>('doer');

  const mockAnalysis = {
    confidenceScore: 0.85,
    recommendedDecision: 'full_payment',
    reasoning: `Evidence Score: 85%
Plausibility: 90%
Safety: low
Doer Reliability: GREEN
Doer Rating: 4.8/5.0
Disputes (30d): 0`,
    safetyConcern: false,
  };

  const mockEvidence = {
    hasGps: true,
    gpsLocation: '1.3521, 103.8198',
    photoCount: 3,
    photoPreviews: [
      'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%22 height=%22100%22%3E%3Crect fill=%22%23ddd%22 width=%22100%22 height=%22100%22/%3E%3Ctext x=%2250%22 y=%2250%22 text-anchor=%22middle%22 dy=%22.3em%22 font-size=%2214%22 fill=%22%23999%22%3EPhoto 1%3C/text%3E%3C/svg%3E',
      'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%22 height=%22100%22%3E%3Crect fill=%22%23ccc%22 width=%22100%22 height=%22100%22/%3E%3Ctext x=%2250%22 y=%2250%22 text-anchor=%22middle%22 dy=%22.3em%22 font-size=%2214%22 fill=%22%23999%22%3EPhoto 2%3C/text%3E%3C/svg%3E',
      'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%22 height=%22100%22%3E%3Crect fill=%22%23bbb%22 width=%22100%22 height=%22100%22/%3E%3Ctext x=%2250%22 y=%2250%22 text-anchor=%22middle%22 dy=%22.3em%22 font-size=%2214%22 fill=%22%23999%22%3EPhoto 3%3C/text%3E%3C/svg%3E',
    ],
    hasChat: true,
    waitTime: 25,
  };

  return (
    <div className="min-h-screen bg-errandify-bg p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Dispute Resolution Test</h1>
          <p className="text-xs text-gray-600">Test the complete doer dispute → admin review flow</p>
        </div>

        {/* View Selector */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => {
              setViewMode('doer');
              setDisputeType('doer');
            }}
            className={`px-4 py-2.5 rounded-lg font-bold text-sm transition ${
              viewMode === 'doer'
                ? 'bg-orange-500 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            👤 Doer (Can't Complete)
          </button>
          <button
            onClick={() => {
              setViewMode('asker');
              setDisputeType('asker');
            }}
            className={`px-4 py-2.5 rounded-lg font-bold text-sm transition ${
              viewMode === 'asker'
                ? 'bg-red-500 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            👤 Asker (Work Failed)
          </button>
          <button
            onClick={() => setViewMode('admin')}
            className={`px-4 py-2.5 rounded-lg font-bold text-sm transition ${
              viewMode === 'admin'
                ? 'bg-blue-500 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            👨‍⚖️ Admin
          </button>
        </div>

        {/* Doer View - Cannot Complete */}
        {viewMode === 'doer' && (
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="max-w-2xl mx-auto space-y-4">
              <div className="border-l-4 border-orange-500 bg-orange-50 p-3 rounded-lg">
                <h3 className="font-bold text-orange-900 text-sm mb-1">You're the doer</h3>
                <p className="text-xs text-orange-800">
                  Asker prevented completion. Report it and request fair compensation.
                </p>
              </div>

              <div className="bg-gray-50 rounded-xl p-3 space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-gray-600">Job:</span>
                  <span className="text-gray-900">Fix Wifi Router</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-gray-600">Asker:</span>
                  <span className="text-gray-900">John Tan</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-gray-600">Budget:</span>
                  <span className="text-gray-900">SGD $50</span>
                </div>
              </div>

              <button
                onClick={() => setShowDoerModal(true)}
                className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white py-2.5 rounded-lg font-bold hover:from-orange-600 hover:to-orange-700 transition text-sm"
              >
                📝 Cannot Complete
              </button>

              <div className="text-xs text-gray-600 p-2.5 bg-gray-50 rounded-lg">
                4-step form: reason → evidence → review → submit
              </div>

              {submittedDispute && disputeType === 'doer' && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-3">
                  <p className="text-xs font-bold text-green-900">✅ Submitted!</p>
                  <p className="text-xs text-green-800 mt-1">
                    ID: #{submittedDispute.id} → Switch to Admin View
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Asker View - Work Not Completed */}
        {viewMode === 'asker' && (
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="max-w-2xl mx-auto space-y-4">
              <div className="border-l-4 border-red-500 bg-red-50 p-3 rounded-lg">
                <h3 className="font-bold text-red-900 text-sm mb-1">You're the asker</h3>
                <p className="text-xs text-red-800">
                  Doer failed to complete properly. Report it and request a refund.
                </p>
              </div>

              <div className="bg-gray-50 rounded-xl p-3 space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-gray-600">Job:</span>
                  <span className="text-gray-900">Fix Wifi Router</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-gray-600">Doer:</span>
                  <span className="text-gray-900">Sarah Lee</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-gray-600">You paid:</span>
                  <span className="text-gray-900">SGD $50</span>
                </div>
              </div>

              <button
                onClick={() => setShowAskerModal(true)}
                className="w-full bg-gradient-to-r from-red-500 to-red-600 text-white py-2.5 rounded-lg font-bold hover:from-red-600 hover:to-red-700 transition text-sm"
              >
                📝 Work Not Completed
              </button>

              <div className="text-xs text-gray-600 p-2.5 bg-gray-50 rounded-lg">
                Report issue with photos & description for refund
              </div>

              {submittedDispute && disputeType === 'asker' && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-3">
                  <p className="text-xs font-bold text-green-900">✅ Submitted!</p>
                  <p className="text-xs text-green-800 mt-1">
                    ID: #{submittedDispute.id} → Switch to Admin View
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Admin View */}
        {viewMode === 'admin' && (
          <div>
            {submittedDispute ? (
              <DisputeReviewPanel
                disputeId={12345}
                doerName={disputeType === 'doer' ? 'Sarah Lee' : 'Sarah Lee'}
                askerName="John Tan"
                jobTitle="Fix Wifi Router"
                budget={50}
                disputeType={disputeType === 'doer' ? 'asker_prevented' : 'work_not_completed'}
                reason={disputeType === 'doer' ? 'asker_unavailable' : 'poor_quality'}
                description={submittedDispute.description || `Issue reported. Needs review and decision.`}
                evidence={mockEvidence}
                analysis={mockAnalysis}
                onDecision={(decision, notes) => {
                  alert(`Decision: ${decision}\nNotes: ${notes}`);
                }}
                onClose={() => setViewMode(disputeType === 'doer' ? 'doer' : 'asker')}
              />
            ) : (
              <div className="bg-white rounded-2xl shadow-lg p-6 text-center">
                <p className="text-sm text-gray-600 mb-3">No dispute to review yet.</p>
                <button
                  onClick={() => setViewMode('doer')}
                  className="bg-blue-500 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-600 transition text-sm"
                >
                  Create dispute first (Doer or Asker view)
                </button>
              </div>
            )}
          </div>
        )}

        {/* Test Instructions */}
        <div className="mt-6 bg-amber-50 border-l-4 border-amber-500 rounded-lg p-4">
          <h3 className="font-bold text-amber-900 text-sm mb-2">Test Both Scenarios:</h3>
          <div className="space-y-3 text-xs text-amber-800">
            <div>
              <p className="font-bold">🟠 Doer Dispute (Asker prevented):</p>
              <ol className="list-decimal list-inside space-y-0.5 ml-2">
                <li>Click "Doer (Can't Complete)" tab</li>
                <li>Click "📝 Cannot Complete"</li>
                <li>Fill: reason, description, GPS, photos, wait time</li>
                <li>Switch to Admin → Review & decide payment</li>
              </ol>
            </div>
            <div>
              <p className="font-bold">🔴 Asker Dispute (Doer failed):</p>
              <ol className="list-decimal list-inside space-y-0.5 ml-2">
                <li>Click "Asker (Work Failed)" tab</li>
                <li>Click "📝 Work Not Completed"</li>
                <li>Fill: reason, description, photos</li>
                <li>Switch to Admin → Review & decide refund</li>
              </ol>
            </div>
          </div>
        </div>
      </div>

      {/* Doer Modal - Cannot Complete */}
      <CannotCompleteModal
        isOpen={showDoerModal}
        onClose={() => setShowDoerModal(false)}
        taskId={12345}
        taskTitle="Fix Wifi Router"
        budget={50}
        onSubmit={(success) => {
          if (success) {
            setSubmittedDispute({
              id: Math.floor(Math.random() * 10000),
              description: 'Doer dispute submitted - check Admin View',
            });
            setDisputeType('doer');
            setViewMode('admin');
          }
        }}
      />

      {/* Asker Modal - Work Not Completed */}
      <JobNotCompletedModal
        isOpen={showAskerModal}
        onClose={() => setShowAskerModal(false)}
        taskId={12345}
        taskTitle="Fix Wifi Router"
        budget={50}
        onSubmit={(success) => {
          if (success) {
            setSubmittedDispute({
              id: Math.floor(Math.random() * 10000),
              description: 'Asker dispute submitted - check Admin View',
            });
            setDisputeType('asker');
            setViewMode('admin');
          }
        }}
      />
    </div>
  );
}
