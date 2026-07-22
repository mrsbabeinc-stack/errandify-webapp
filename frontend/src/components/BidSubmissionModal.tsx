import { useState, useEffect } from 'react';
import { useAppContext } from '../hooks/useAppContext';
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

  // Nobody should type out an offer only to be told afterwards that we cannot
  // pay them. Checked when the modal opens, and re-checked if they switch
  // between offering personally and as their company.
  const [payoutBlock, setPayoutBlock] = useState<any>(null);
  const [checkingPayout, setCheckingPayout] = useState(true);

  // Who is this offer from — the person, or their company?
  const { company, mode } = useAppContext();
  const canOfferAsCompany = !!company?.can_act_for_company && !!company?.certified;
  // Default to whichever hat they're currently wearing
  const [offerAsCompany, setOfferAsCompany] = useState(false);
  useEffect(() => {
    if (canOfferAsCompany && mode === 'company') setOfferAsCompany(true);
  }, [canOfferAsCompany, mode]);

  useEffect(() => {
    const check = async () => {
      setCheckingPayout(true);
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(
          `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/bids/payout-readiness`,
          {
            params: { actAsCompany: offerAsCompany ? 'true' : 'false' },
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setPayoutBlock(res.data?.data?.ready ? null : res.data?.data);
      } catch {
        // Our check failing is not the doer's problem — let them through and
        // the server will still catch it on submit
        setPayoutBlock(null);
      } finally {
        setCheckingPayout(false);
      }
    };
    check();
  }, [offerAsCompany]);

  // Load existing note when updating
  useEffect(() => {
    if (isUpdating && taskId) {
      const loadExistingNote = async () => {
        try {
          const token = localStorage.getItem('token');
          const response = await axios.get(
            `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/bids/check/${taskId}`,
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
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/bids`,
        {
          task_id: taskId,
          amount: parseFloat(bidAmount),
          note: bidNote || null,
          // When offering as the company, it becomes the counterparty the asker
          // sees AND the party that gets paid — staff are paid via payroll.
          ...(offerAsCompany && { actAsCompany: true }),
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
              `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/notifications`,
              {
                recipientId: askerId,
                type: 'bid_placed',
                title: isUpdating ? 'Offer Updated' : 'New Offer Received',
                message: `A ${isUpdating ? 'updated' : 'new'} offer of $${bidAmount} was placed on "${taskTitle}"`,
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
      if (err.response?.data?.reason === 'payout_not_ready') {
        setPayoutBlock(err.response.data.payoutBlock);
        return;
      }
      const errorMsg = err.response?.data?.error || err.response?.data?.message || 'We encountered a small hiccup. Please try again.';
      setError(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (checkingPayout) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-md w-full p-8 text-center text-gray-500 text-sm">
          Just a moment…
        </div>
      </div>
    );
  }

  // A gentle nudge, not a rejection — they have not done anything wrong, they
  // just have one setup step left before they can be paid.
  if (payoutBlock) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-gradient-to-br from-orange-50 to-white rounded-2xl max-w-sm w-full p-7 text-center grid gap-3 justify-items-center shadow-xl">
          <span className="text-4xl">🌱</span>
          <h2 className="text-lg font-extrabold text-errandify-brown tracking-tight">
            {payoutBlock.title || 'One small thing first'}
          </h2>
          <p className="text-[13.5px] text-gray-700 leading-relaxed">{payoutBlock.message}</p>
          <p className="text-[12px] text-gray-500">
            "{taskTitle}" will still be here when you get back.
          </p>
          <div className="grid gap-2 w-full mt-1">
            <button
              onClick={() =>
                // Neither /company/profile nor /account/payouts is a registered
                // route — these were dead links I introduced. Payout setup lives
                // on the company dashboard and the personal account page.
                (window.location.href = payoutBlock.forCompany ? '/company/dashboard' : '/my-account')
              }
              className="w-full bg-errandify-orange text-white font-bold text-[14px] py-3 rounded-full shadow-sm hover:bg-opacity-90"
            >
              {payoutBlock.ctaLabel || 'Set up payouts'}
            </button>
            <button
              onClick={onClose}
              className="w-full text-gray-600 font-semibold text-[13px] py-2"
            >
              Maybe later
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <h2 className="text-xl font-bold text-errandify-brown mb-2">
          {isUpdating ? 'Update Your Offer' : 'Submit Your Offer'}
        </h2>
        <p className="text-gray-600 text-sm mb-4">"{taskTitle}"</p>
        {isUpdating && (
          <p className="text-xs text-orange-600 mb-3 bg-orange-50 p-2 rounded">
            Previous offer: ${existingBidAmount} • Update to a new amount below
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Offering personally or on behalf of the company — this decides who
              the asker deals with and, crucially, who gets paid. */}
          {canOfferAsCompany && (
            <div className="rounded-company border border-gray-200 bg-gray-50 p-3">
              <p className="text-[12px] font-bold text-gray-700 mb-2">Send this offer as</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setOfferAsCompany(false)}
                  className={`text-left px-3 py-2 rounded-company border text-[12.5px] font-bold ${
                    !offerAsCompany
                      ? 'bg-white border-errandify-orange text-errandify-orange-deep'
                      : 'bg-white border-gray-200 text-gray-600'
                  }`}
                >
                  🙋 Myself
                </button>
                <button
                  type="button"
                  onClick={() => setOfferAsCompany(true)}
                  className={`text-left px-3 py-2 rounded-company border text-[12.5px] font-bold truncate ${
                    offerAsCompany
                      ? 'bg-white border-kampung-jade text-ok'
                      : 'bg-white border-gray-200 text-gray-600'
                  }`}
                  title={company?.name}
                >
                  <span className="block">🏢 MyBizOffer</span>
                  <span className="block text-[10.5px] font-semibold opacity-75 truncate">{company?.name}</span>
                </button>
              </div>
              <p className="text-[11.5px] text-gray-600 mt-2 leading-snug">
                {offerAsCompany
                  ? `Sent as a MyBizOffer — ${company?.name} is shown to the neighbour, you can assign staff to it, and payment goes to the company.`
                  : 'This offer is from you personally, and payment goes to your own account.'}
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-errandify-brown mb-2">
              Your Offer Amount ($)
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
                placeholder={`Errand budget: $${taskBudget}`}
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
              Use +/− buttons or type directly to adjust offer
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
              Suggestion: Mention your relevant experience, skills, and why you're the best fit for this errand!
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
              {isSubmitting ? (isUpdating ? 'Updating...' : 'Submitting...') : (isUpdating ? 'Update Offer' : 'Submit Offer')}
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
