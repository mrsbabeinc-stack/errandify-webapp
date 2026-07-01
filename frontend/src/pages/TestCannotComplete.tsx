import React, { useState } from 'react';
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
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Dispute Resolution V2 - Full UI Test</h1>
          <p className="text-gray-600">Test the complete flow from doer dispute creation to admin review</p>
        </div>

        {/* View Selector */}
        <div className="flex gap-4 mb-8">
          <button
            onClick={() => {
              setViewMode('doer');
              setShowCannotCompleteModal(true);
            }}
            className={`px-6 py-3 rounded-lg font-bold transition ${
              viewMode === 'doer'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            👤 Doer View (Create Dispute)
          </button>
          <button
            onClick={() => setViewMode('admin')}
            className={`px-6 py-3 rounded-lg font-bold transition ${
              viewMode === 'admin'
                ? 'bg-orange-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            👨‍⚖️ Admin View (Review Dispute)
          </button>
        </div>

        {/* Doer View */}
        {viewMode === 'doer' && (
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="max-w-2xl mx-auto space-y-6">
              <div className="border-l-4 border-blue-500 bg-blue-50 p-4 rounded">
                <h3 className="font-bold text-blue-900 mb-2">Doer Perspective</h3>
                <p className="text-sm text-blue-800">
                  You arrived at a job but the asker wasn't available. Use the form below to create a
                  dispute and request payment for your time and effort.
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm font-semibold text-gray-600">Job:</span>
                  <span className="text-sm text-gray-900">Fix Wifi Router</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-semibold text-gray-600">Asker:</span>
                  <span className="text-sm text-gray-900">John Tan</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-semibold text-gray-600">Budget:</span>
                  <span className="text-sm text-gray-900">SGD $50</span>
                </div>
              </div>

              <button
                onClick={() => setShowCannotCompleteModal(true)}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition"
              >
                🚨 I Cannot Complete This Job
              </button>

              <div className="text-xs text-gray-500 p-3 bg-gray-50 rounded">
                This will open a form where you can explain what prevented you from completing the job,
                provide GPS location proof, upload photos, and submit evidence.
              </div>

              {submittedDispute && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-sm font-bold text-green-900">✅ Dispute Submitted!</p>
                  <p className="text-xs text-green-800 mt-2">
                    Dispute ID: #{submittedDispute.id}
                  </p>
                  <p className="text-xs text-green-700 mt-1">
                    Click "Admin View" to see how this dispute looks for admin review.
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
              <div className="bg-white rounded-lg shadow-lg p-8 text-center">
                <p className="text-gray-600 mb-4">No dispute submitted yet.</p>
                <button
                  onClick={() => setViewMode('doer')}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-700 transition"
                >
                  ← Go to Doer View & Create Dispute
                </button>
              </div>
            )}
          </div>
        )}

        {/* Test Instructions */}
        <div className="mt-8 bg-amber-50 border border-amber-200 rounded-lg p-6">
          <h3 className="font-bold text-amber-900 mb-3">Testing Guide:</h3>
          <ol className="text-sm text-amber-800 space-y-2 list-decimal list-inside">
            <li>Start in <strong>Doer View</strong> and click "I Cannot Complete This Job"</li>
            <li>Fill out the 4-step form:
              <ul className="list-disc list-inside ml-6 mt-1 space-y-1">
                <li>Select a reason for not completing</li>
                <li>Enter description (50+ words)</li>
                <li>Capture GPS location & photos</li>
                <li>Review & submit</li>
              </ul>
            </li>
            <li>After submission, switch to <strong>Admin View</strong></li>
            <li>Review the submitted dispute with AI analysis</li>
            <li>Make a decision (Approve/Partial/Reject/Escalate)</li>
            <li>Add admin notes visible to both parties</li>
            <li>Submit your decision</li>
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
