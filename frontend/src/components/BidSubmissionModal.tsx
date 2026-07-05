import { useState, useEffect } from 'react';
import axios from 'axios';
import WarmMessage from './WarmMessage';
import { formatCurrency } from '../utils/format';

interface BidSubmissionModalProps {
  taskId: number;
  taskBudget: number;
  taskTitle: string;
  existingBidAmount?: number;
  askerId?: number;
  selectedSessions?: number[];
  onSuccess: () => void;
  onClose: () => void;
}

export default function BidSubmissionModal({
  taskId,
  taskBudget,
  taskTitle,
  existingBidAmount,
  askerId,
  selectedSessions,
  onSuccess,
  onClose,
}: BidSubmissionModalProps) {
  const isUpdating = !!existingBidAmount;
  const [bidAmount, setBidAmount] = useState<string>(existingBidAmount?.toString() || taskBudget?.toString() || '');
  const [bidNote, setBidNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [successAmount, setSuccessAmount] = useState<string>('');

  // Load existing note when updating
  useEffect(() => {
    if (isUpdating && taskId) {
      const loadExistingNote = async () => {
        try {
          const token = localStorage.getItem('token');
          const response = await axios.get(
            `${import.meta.env.VITE_API_URL || window.location.origin}/api/bids/check/${taskId}`,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );
          if (response.data.hasBid && response.data.bidNote) {
            setBidNote(response.data.bidNote);
          }
        } catch (err) {
          console.error('Failed to load existing note:', err);
        }
      };
      loadExistingNote();
    }
  }, [isUpdating, taskId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL || window.location.origin}/api/bids`,
        {
          task_id: taskId,
          amount: parseFloat(bidAmount),
          note: bidNote || null,
          ...(selectedSessions && selectedSessions.length > 0 && { sessions: selectedSessions }),
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      // Show success message
      if (response.data.success) {
        // Save bid to localStorage for display in browse page
        const bids = JSON.parse(localStorage.getItem('userBids') || '{}');
        bids[taskId.toString()] = parseFloat(bidAmount);
        localStorage.setItem('userBids', JSON.stringify(bids));

        // Send notification to asker
        if (askerId) {
          try {
            await axios.post(
              `${import.meta.env.VITE_API_URL || window.location.origin}/api/notifications`,
              {
                recipientId: askerId,
                type: 'bid_placed',
                title: isUpdating ? 'Offer Updated' : 'New Offer Received',
                message: `A ${isUpdating ? 'updated' : 'new'} bid of $${bidAmount} was placed on "${taskTitle}"`,
                taskId,
              },
              { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
            );
          } catch (notifErr) {
            console.error('Failed to send notification:', notifErr);
          }
        }

        // Show warm, kampung-style success modal
        setSuccessAmount(bidAmount);
        setShowSuccess(true);
        setTimeout(() => {
          setShowSuccess(false);
          onSuccess();
        }, 3500);
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || err.response?.data?.message || 'We encountered a small hiccup. Please try again.';
      setError(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <h2 className="text-xl font-bold text-errandify-brown mb-2">
          {isUpdating ? 'Update Your Bid' : 'Submit Your Bid'}
        </h2>
        <p className="text-gray-600 text-sm mb-4">"{taskTitle}"</p>
        {isUpdating && (
          <p className="text-xs text-orange-600 mb-3 bg-orange-50 p-2 rounded">
            Previous bid: ${existingBidAmount} • Update to a new amount below
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-errandify-brown mb-2">
              Your Bid Amount ($)
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const current = parseInt(bidAmount) || taskBudget;
                  const newVal = Math.max(8, current - 5);
                  setBidAmount(newVal.toString());
                }}
                className="px-3 py-2 bg-gray-200 hover:bg-gray-300 rounded font-bold text-lg transition-colors"
              >
                −
              </button>
              <input
                type="text"
                inputMode="numeric"
                min="8"
                value={bidAmount}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '') {
                    setBidAmount('');
                  } else {
                    const num = Math.max(8, parseInt(val));
                    setBidAmount(num.toString());
                  }
                }}
                placeholder={`Task budget: $${taskBudget}`}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-errandify-orange text-center text-lg font-bold"
                required
              />
              <button
                type="button"
                onClick={() => {
                  const current = parseInt(bidAmount) || taskBudget;
                  const newVal = current + 5;
                  setBidAmount(newVal.toString());
                }}
                className="px-3 py-2 bg-errandify-orange hover:bg-opacity-90 text-white rounded font-bold text-lg transition-colors"
              >
                +
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Use +/− buttons or type directly to adjust bid
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-errandify-brown mb-2">
              Note (Optional)
            </label>
            <textarea
              value={bidNote}
              onChange={(e) => setBidNote(e.target.value)}
              placeholder="Explain your experience, why you're a good fit, etc."
              rows={3}
              className="w-full px-3 py-2 border border-errandify-orange rounded-lg focus:outline-none focus:ring-2 focus:ring-errandify-orange"
            />
            <div className="text-xs text-errandify-orange mt-2 px-3 py-2 bg-orange-50 rounded-lg border border-orange-200 font-medium">
              Suggestion: Mention your relevant experience, skills, and why you're the best fit for this task!
            </div>
          </div>


          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !bidAmount}
              className="flex-1 px-4 py-2 bg-errandify-orange text-white rounded-lg font-semibold hover:bg-opacity-90 disabled:opacity-50"
            >
              {isSubmitting ? (isUpdating ? 'Updating...' : 'Submitting...') : (isUpdating ? 'Update Bid' : 'Submit Bid')}
            </button>
          </div>
        </form>
      </div>

      {/* Error Message - Warm & Friendly */}
      <WarmMessage
        isOpen={!!error}
        type="error"
        title="Hold on"
        message={error}
        onClose={() => setError('')}
        buttonLabel="Got it"
      />

      {/* Success Modal - Fun & Engaging */}
      {showSuccess && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-emerald-50 to-white rounded-2xl max-w-sm w-full p-8 text-center shadow-2xl border-l-4 border-l-emerald-500 transform animate-bounce">
            <div className="text-5xl mb-4">
              {isUpdating ? '💚' : '🎉'}
            </div>
            <h2 className="text-2xl font-bold text-emerald-600 mb-2">
              {isUpdating ? 'Offer updated' : 'Offer in'}
            </h2>
            <p className="text-lg font-semibold text-slate-900 mb-4">
              {formatCurrency(successAmount)}
            </p>
            <p className="text-slate-700 text-base mb-4 leading-relaxed">
              {isUpdating
                ? 'Your neighbour will see the update right away'
                : 'Your neighbour will see this right away. Good luck getting picked'}
            </p>
            <p className="text-emerald-600 font-medium text-sm">
              We have got you, neighbour
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
