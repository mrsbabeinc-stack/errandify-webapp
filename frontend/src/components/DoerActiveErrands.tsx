import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

interface ActiveErrand {
  id: number;
  errandId: string;
  title: string;
  description: string;
  askerName: string;
  status: 'confirmed' | 'acknowledged' | 'confirmed_awaiting_start' | 'in_progress' | 'job_completed';
  budget: number;
  location: string;
  deadline?: string;
  createdAt: string;
  bidId?: number;
  bidStatus?: string;
}

const DoerActiveErrands: React.FC = () => {
  const navigate = useNavigate();
  const [errands, setErrands] = useState<ActiveErrand[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'confirmed' | 'acknowledged' | 'confirmed_awaiting_start' | 'in_progress' | 'job_completed' | 'all'>('all');
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelErrandId, setCancelErrandId] = useState<number | null>(null);
  const [cancelReason, setCancelReason] = useState('staff_unavailable');
  const [cancelCustomReason, setCancelCustomReason] = useState('');

  const cancelReasons = [
    { value: 'staff_unavailable', label: 'Staff member no longer available' },
    { value: 'circumstances_changed', label: 'Circumstances changed' },
    { value: 'equipment_issue', label: 'Equipment or resource issue' },
    { value: 'safety_concern', label: 'Safety concern' },
    { value: 'other', label: 'Other reason' },
  ];

  // Fetch active errands that user has accepted bids on
  useEffect(() => {
    const fetchActiveErrands = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setError('Not authenticated');
          setLoading(false);
          return;
        }

        // Fetch accepted assignments for current user
        const response = await axios.get(
          `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/errands?accepted=true`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        if (response.data.success) {
          const activeErrands = response.data.data.map((errand: any) => ({
            id: errand.id,
            errandId: errand.errandId || errand.formatted_id,
            title: errand.title,
            description: errand.description,
            askerName: errand.askerName,
            status: errand.status,
            budget: errand.budget,
            location: errand.location,
            deadline: errand.deadline,
            createdAt: errand.createdAt,
          }));
          setErrands(activeErrands);
        }
      } catch (err) {
        console.error('Failed to fetch active errands:', err);
        setError('Failed to load active errands');
      } finally {
        setLoading(false);
      }
    };

    fetchActiveErrands();
  }, []);

  const handleAcknowledge = async (errandId: number) => {
    try {
      const token = localStorage.getItem('token');

      await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/errands/${errandId}/acknowledge`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      alert('✅ Errand acknowledged! Waiting for manager confirmation...');
      setErrands(errands.map(e => e.id === errandId ? { ...e, status: 'acknowledged' } : e));
    } catch (err) {
      console.error('Failed to acknowledge:', err);
      alert('Failed to acknowledge. Please try again.');
    }
  };

  const handleStart = async (errandId: number) => {
    try {
      const token = localStorage.getItem('token');

      await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/errands/${errandId}/start`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      alert('Started! Timer is running.');
      setErrands(errands.map(e => e.id === errandId ? { ...e, status: 'in_progress' } : e));
    } catch (err) {
      console.error('Failed to start:', err);
      alert('Failed to start. Please try again.');
    }
  };

  const handleComplete = (errandId: number) => {
    // Navigate to completion page with evidence upload
    navigate(`/errand/${errandId}/complete`, { state: { fromActive: true } });
  };

  const handleViewDetails = (errandId: number) => {
    navigate(`/errand/${errandId}`);
  };

  const openCancelModal = (errandId: number) => {
    setCancelErrandId(errandId);
    setCancelReason('staff_unavailable');
    setCancelCustomReason('');
    setShowCancelModal(true);
  };

  const handleConfirmCancel = async () => {
    if (!cancelErrandId) return;

    try {
      const token = localStorage.getItem('token');
      const finalReason = cancelReason === 'other' ? cancelCustomReason : cancelReason;

      if (!finalReason) {
        alert('Please provide a reason for cancellation');
        return;
      }

      // Cancel the errand - revert to open status
      await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/errands/${cancelErrandId}/cancel`,
        { cancellationReason: finalReason, cancelledBy: 'doer' },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      alert('Errand cancelled. It is now open for other doers to bid.');
      setShowCancelModal(false);
      setCancelErrandId(null);

      // Remove from active list
      setErrands(errands.filter(e => e.id !== cancelErrandId));
    } catch (err) {
      console.error('Failed to cancel:', err);
      alert('Failed to cancel errand. Please try again.');
    }
  };

  const getStatusDisplay = (status: string) => {
    const statusMap: { [key: string]: { label: string; color: string; icon: string } } = {
      'confirmed': { label: 'Awaiting Acknowledgment', color: '#FFC107', icon: '📋' },
      'acknowledged': { label: 'Awaiting Manager Confirmation', color: '#FF9800', icon: '⏳' },
      'confirmed_awaiting_start': { label: 'Ready to Start', color: '#4CAF50', icon: '✅' },
      'in_progress': { label: 'In Progress', color: '#2196F3', icon: '⚙️' },
      'job_completed': { label: 'Completed', color: '#4CAF50', icon: '✅' },
    };
    return statusMap[status] || statusMap['confirmed'];
  };

  const filteredErrands = selectedFilter === 'all'
    ? errands
    : errands.filter(e => e.status === selectedFilter);

  if (loading) {
    return <div className="p-4 text-center">Loading active errands...</div>;
  }

  return (
    <div className="space-y-4 p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Active Errands</h2>
        <span className="bg-errandify-orange text-white px-3 py-1 rounded-full text-sm font-semibold">
          {errands.length} Total
        </span>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {(['confirmed', 'acknowledged', 'confirmed_awaiting_start', 'in_progress', 'job_completed', 'all'] as const).map(filter => (
          <button
            key={filter}
            onClick={() => setSelectedFilter(filter)}
            className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
              selectedFilter === filter
                ? 'bg-errandify-orange text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {filter === 'confirmed' ? 'Awaiting ACK' :
             filter === 'acknowledged' ? 'Awaiting Confirm' :
             filter === 'confirmed_awaiting_start' ? 'Ready' :
             filter === 'in_progress' ? 'In Progress' :
             filter === 'job_completed' ? 'Completed' : 'All'}
            <span className="ml-1 text-sm">
              ({errands.filter(e => filter === 'all' ? true : e.status === filter).length})
            </span>
          </button>
        ))}
      </div>

      {/* Errands List */}
      {filteredErrands.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>No {selectedFilter === 'all' ? 'active' : selectedFilter} errands</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredErrands.map(errand => {
            const statusDisplay = getStatusDisplay(errand.status);
            return (
              <div
                key={errand.id}
                className="bg-white border-2 border-orange-100 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-errandify-brown">{errand.title}</h3>
                    <p className="text-sm text-gray-600">{errand.errandId}</p>
                  </div>
                  <span
                    className="px-3 py-1 rounded-full text-sm font-semibold"
                    style={{ backgroundColor: statusDisplay.color + '20', color: statusDisplay.color }}
                  >
                    {statusDisplay.icon} {statusDisplay.label}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
                  <div>
                    <p className="text-gray-500">Asker</p>
                    <p className="font-semibold">{errand.askerName}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Budget</p>
                    <p className="font-semibold">SGD ${errand.budget}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-gray-500">Location</p>
                    <p className="font-semibold">{errand.location}</p>
                  </div>
                </div>

                <p className="text-sm text-gray-600 mb-4">{errand.description}</p>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  {errand.status === 'confirmed' && (
                    <>
                      <button
                        onClick={() => handleAcknowledge(errand.id)}
                        className="flex-1 bg-errandify-orange text-white py-2 rounded-lg font-bold hover:bg-opacity-90 transition-colors"
                      >
                        📋 Acknowledge Receipt
                      </button>
                      <button
                        onClick={() => openCancelModal(errand.id)}
                        className="flex-1 bg-red-500 text-white py-2 rounded-lg font-bold hover:bg-red-600 transition-colors"
                      >
                        ✕ Cancel
                      </button>
                      <button
                        onClick={() => handleViewDetails(errand.id)}
                        className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg font-bold hover:bg-gray-300 transition-colors"
                      >
                        View Details
                      </button>
                    </>
                  )}

                  {errand.status === 'acknowledged' && (
                    <>
                      <button
                        disabled
                        className="flex-1 bg-gray-300 text-gray-600 py-2 rounded-lg font-bold cursor-not-allowed"
                      >
                        ⏳ Awaiting Manager Confirmation
                      </button>
                      <button
                        onClick={() => handleViewDetails(errand.id)}
                        className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg font-bold hover:bg-gray-300 transition-colors"
                      >
                        View Details
                      </button>
                    </>
                  )}

                  {errand.status === 'confirmed_awaiting_start' && (
                    <>
                      <button
                        onClick={() => handleStart(errand.id)}
                        className="flex-1 bg-green-500 text-white py-2 rounded-lg font-bold hover:bg-green-600 transition-colors"
                      >
                        ▶ Start Errand
                      </button>
                      <button
                        onClick={() => openCancelModal(errand.id)}
                        className="flex-1 bg-red-500 text-white py-2 rounded-lg font-bold hover:bg-red-600 transition-colors"
                      >
                        ✕ Cancel
                      </button>
                      <button
                        onClick={() => handleViewDetails(errand.id)}
                        className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg font-bold hover:bg-gray-300 transition-colors"
                      >
                        View Details
                      </button>
                    </>
                  )}

                  {errand.status === 'in_progress' && (
                    <>
                      <button
                        onClick={() => handleComplete(errand.id)}
                        className="flex-1 bg-green-500 text-white py-2 rounded-lg font-bold hover:bg-green-600 transition-colors"
                      >
                        ✓ Mark Complete
                      </button>
                      <button
                        onClick={() => handleViewDetails(errand.id)}
                        className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg font-bold hover:bg-gray-300 transition-colors"
                      >
                        💬 Chat
                      </button>
                    </>
                  )}

                  {errand.status === 'job_completed' && (
                    <button
                      onClick={() => handleViewDetails(errand.id)}
                      className="w-full bg-blue-500 text-white py-2 rounded-lg font-bold hover:bg-blue-600 transition-colors"
                    >
                      View & Rate
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-errandify-brown mb-4">Cancel Errand?</h3>

            <p className="text-gray-600 mb-4">
              Please select a reason for cancellation. The errand will return to open status for other doers to bid.
            </p>

            <div className="mb-4 space-y-2">
              {cancelReasons.map(reason => (
                <label key={reason.value} className="flex items-center p-2 border rounded cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="cancelReason"
                    value={reason.value}
                    checked={cancelReason === reason.value}
                    onChange={(e) => setCancelReason(e.target.value)}
                    className="mr-3"
                  />
                  <span className="text-gray-700">{reason.label}</span>
                </label>
              ))}
            </div>

            {cancelReason === 'other' && (
              <textarea
                placeholder="Please explain your reason for cancellation..."
                value={cancelCustomReason}
                onChange={(e) => setCancelCustomReason(e.target.value)}
                className="w-full p-2 border rounded mb-4 focus:outline-none focus:border-errandify-orange"
                rows={3}
              />
            )}

            <div className="flex gap-2">
              <button
                onClick={() => setShowCancelModal(false)}
                className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg font-bold hover:bg-gray-300 transition-colors"
              >
                Keep It
              </button>
              <button
                onClick={handleConfirmCancel}
                className="flex-1 bg-red-500 text-white py-2 rounded-lg font-bold hover:bg-red-600 transition-colors"
              >
                Confirm Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoerActiveErrands;
