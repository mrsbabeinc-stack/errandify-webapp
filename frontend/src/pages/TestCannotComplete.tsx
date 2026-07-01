import { useState } from 'react';
import CannotCompleteModal from '../components/CannotCompleteModal';
import DisputeReviewPanel from '../components/DisputeReviewPanel';

type ViewMode = 'doer' | 'admin';

export default function TestCannotComplete() {
  const [viewMode, setViewMode] = useState<ViewMode>('doer');
  const [showCannotCompleteModal, setShowCannotCompleteModal] = useState(false);
  const [submittedDispute, setSubmittedDispute] = useState<any>(null);

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
              setShowCannotCompleteModal(true);
            }}
            className={`px-4 py-2.5 rounded-lg font-bold text-sm transition ${
              viewMode === 'doer'
                ? 'bg-orange-500 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            👤 Doer
          </button>
          <button
            onClick={() => setViewMode('admin')}
            className={`px-4 py-2.5 rounded-lg font-bold text-sm transition ${
              viewMode === 'admin'
                ? 'bg-orange-500 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            👨‍⚖️ Admin
          </button>
        </div>

        {/* Doer View */}
        {viewMode === 'doer' && (
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="max-w-2xl mx-auto space-y-4">
              <div className="border-l-4 border-orange-500 bg-orange-50 p-3 rounded-lg">
                <h3 className="font-bold text-orange-900 text-sm mb-1">You're the doer</h3>
                <p className="text-xs text-orange-800">
                  You arrived but the asker wasn't available. Report it and request fair compensation.
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
                onClick={() => setShowCannotCompleteModal(true)}
                className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white py-2.5 rounded-lg font-bold hover:from-orange-600 hover:to-orange-700 transition text-sm"
              >
                📝 Cannot Complete
              </button>

              <div className="text-xs text-gray-600 p-2.5 bg-gray-50 rounded-lg">
                Complete the 4-step form: reason → evidence → review → submit
              </div>

              {submittedDispute && (
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
                doerName="Sarah Lee"
                askerName="John Tan"
                jobTitle="Fix Wifi Router"
                budget={50}
                disputeType="asker_prevented"
                reason="asker_unavailable"
                description={submittedDispute.description || `I arrived at the job location at 2:15 PM as scheduled. I tried to contact John multiple times through the app but he didn't respond to any of my messages. I waited for 25 minutes at the location before I had to leave to attend to another commitment. The asker was completely unresponsive and unavailable. I made genuine efforts to complete the job but was prevented due to asker's unavailability.`}
                evidence={mockEvidence}
                analysis={mockAnalysis}
                onDecision={(decision, notes) => {
                  alert(`Decision: ${decision}\nNotes: ${notes}`);
                }}
                onClose={() => setViewMode('doer')}
              />
            ) : (
              <div className="bg-white rounded-2xl shadow-lg p-6 text-center">
                <p className="text-sm text-gray-600 mb-3">No dispute to review yet.</p>
                <button
                  onClick={() => setViewMode('doer')}
                  className="bg-orange-500 text-white px-4 py-2 rounded-lg font-bold hover:bg-orange-600 transition text-sm"
                >
                  Create one first
                </button>
              </div>
            )}
          </div>
        )}

        {/* Test Instructions */}
        <div className="mt-6 bg-amber-50 border-l-4 border-amber-500 rounded-lg p-4">
          <h3 className="font-bold text-amber-900 text-sm mb-2">Steps:</h3>
          <ol className="text-xs text-amber-800 space-y-1.5 list-decimal list-inside">
            <li><strong>Doer View</strong> → Click "Cannot Complete"</li>
            <li>Fill: reason, description, GPS, photos, wait time</li>
            <li><strong>Admin View</strong> → Review & decide</li>
            <li>Options: Full Pay / Split 50/50 / Refund / Escalate</li>
            <li>Add warm, fair notes visible to both</li>
            <li>Submit decision</li>
          </ol>
        </div>
      </div>

      {/* Modal Component */}
      <CannotCompleteModal
        isOpen={showCannotCompleteModal}
        onClose={() => setShowCannotCompleteModal(false)}
        taskId={12345}
        taskTitle="Fix Wifi Router"
        budget={50}
        onSubmit={(success) => {
          if (success) {
            setSubmittedDispute({
              id: Math.floor(Math.random() * 10000),
              description: 'Mock dispute submitted - check Admin View',
            });
            setViewMode('admin');
          }
        }}
      />
    </div>
  );
}
