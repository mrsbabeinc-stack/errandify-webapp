import { useState } from 'react';
import axios from 'axios';

interface BidSubmissionModalProps {
  taskId: number;
  taskBudget: number;
  taskTitle: string;
  onSuccess: () => void;
  onClose: () => void;
}

export default function BidSubmissionModal({
  taskId,
  taskBudget,
  taskTitle,
  onSuccess,
  onClose,
}: BidSubmissionModalProps) {
  const [bidAmount, setBidAmount] = useState<string>(taskBudget?.toString() || '');
  const [bidNote, setBidNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/bids`,
        {
          task_id: taskId,
          amount: parseFloat(bidAmount),
          note: bidNote || null,
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

        alert(`✓ Bid submitted for $${bidAmount}!`);
        onSuccess();
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to submit bid');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <h2 className="text-xl font-bold text-errandify-brown mb-2">Submit Your Bid</h2>
        <p className="text-gray-600 text-sm mb-4">"{taskTitle}"</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-errandify-brown mb-2">
              Your Bid Amount ($)
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={bidAmount}
              onChange={(e) => setBidAmount(e.target.value)}
              placeholder={`Task budget: $${taskBudget}`}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-errandify-orange"
              required
            />
            {taskBudget && (
              <p className="text-xs text-gray-500 mt-1">
                Budget: ${taskBudget} {parseFloat(bidAmount) > taskBudget && '(above budget)'}
              </p>
            )}
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-errandify-orange"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
              {error}
            </div>
          )}

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
              {isSubmitting ? 'Submitting...' : 'Submit Bid'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
