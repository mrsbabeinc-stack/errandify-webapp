import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface Errand {
  id: number;
  errandId: string;
  title: string;
  description: string;
  category: string;
  budget: number;
  location: string;
  askerName: string;
  status: 'confirmed' | 'acknowledged' | 'confirmed_awaiting_start';
  acceptedBidId?: number;
  companyConfirmed?: boolean;
}

interface StaffMember {
  id: number;
  display_name: string;
  alias?: string;
  role: string;
}

const DoerAllocateErrands: React.FC = () => {
  const [errands, setErrands] = useState<Errand[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedErrandId, setSelectedErrandId] = useState<number | null>(null);
  const [selectedStaffId, setSelectedStaffId] = useState<number | null>(null);
  const [confirmedErrandId, setConfirmedErrandId] = useState<number | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setError('Not authenticated');
          setLoading(false);
          return;
        }

        // Fetch errands where current user's bid was accepted (for allocation to staff)
        // These are errands posted by others where the current company won the bid
        const errandsResponse = await axios.get(
          `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/errands`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        // Filter for confirmed status errands that have user's accepted bid
        // These are errands ready to be allocated to company staff
        const confirmedErrands = errandsResponse.data.data
          .filter((e: any) => e.status === 'confirmed' && e.acceptedBidId)
          .map((e: any) => ({
            id: e.id,
            errandId: e.errandId || e.formatted_id,
            title: e.title,
            description: e.description,
            category: e.category,
            budget: e.budget,
            location: e.location,
            askerName: e.askerName,
            status: e.status,
            acceptedBidId: e.acceptedBidId,
          }));

        setErrands(confirmedErrands);

        // Use demo staff members (in production, this would fetch from /api/companies/staff)
        setStaff([
          { id: 11, display_name: 'Support L3 Senior', alias: 'Support L3', role: 'Senior Staff' },
          { id: 12, display_name: 'Support L2 Agent', alias: 'Support L2', role: 'Support Agent' },
          { id: 13, display_name: 'Operations Lead', alias: 'Ops', role: 'Operations' },
        ]);

      } catch (err) {
        console.error('Failed to fetch data:', err);
        setError('Failed to load errands and staff');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleConfirmErrand = (errandId: number) => {
    setConfirmedErrandId(errandId);
    setSelectedErrandId(errandId);
    setSelectedStaffId(null);
  };

  const handleAllocate = async () => {
    if (!selectedErrandId || !selectedStaffId) {
      alert('Please select both an errand and a staff member');
      return;
    }

    try {
      const token = localStorage.getItem('token');

      // Create errand assignment
      await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/errand-assignments`,
        {
          errandId: selectedErrandId,
          doerId: selectedStaffId,
          status: 'allocated',
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      alert('Errand allocated successfully!');
      setSelectedErrandId(null);
      setSelectedStaffId(null);

      // Refresh the list
      setErrands(errands.filter(e => e.id !== selectedErrandId));
    } catch (err: any) {
      console.error('Failed to allocate:', err);
      alert(err.response?.data?.error || 'Failed to allocate errand');
    }
  };

  if (loading) {
    return <div className="p-4 text-center">Loading...</div>;
  }

  const selectedErrand = errands.find(e => e.id === selectedErrandId);
  const selectedStaff = staff.find(s => s.id === selectedStaffId);

  return (
    <div className="space-y-4 p-4">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">Allocate Errands to Staff</h2>
        <p className="text-gray-600">Assign accepted errands to your team members for execution</p>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {errands.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>No pending errands to allocate</p>
        </div>
      ) : !confirmedErrandId ? (
        // Step 1: Confirm Errand
        <div className="space-y-4">
          <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 mb-4">
            <p className="text-blue-900 font-semibold">Step 1: Confirm Errand</p>
            <p className="text-sm text-blue-700 mt-2">Select an errand and click "✅ Confirm Errand" to proceed with allocation to staff</p>
          </div>
          <div className="grid grid-cols-1 gap-4">
            {errands.map(errand => (
              <div key={errand.id} className="bg-white border-2 border-orange-100 rounded-lg p-4 hover:shadow-md">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <h3 className="font-bold text-errandify-brown text-lg">{errand.title}</h3>
                    <p className="text-sm text-gray-600">{errand.errandId}</p>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-orange-100 text-orange-700 font-bold text-sm">Confirmed</span>
                </div>
                <div className="grid grid-cols-3 gap-3 mb-4 text-sm">
                  <div>
                    <p className="text-gray-500">Budget</p>
                    <p className="font-semibold">SGD ${errand.budget}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Posted by</p>
                    <p className="font-semibold">{errand.askerName}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Location</p>
                    <p className="font-semibold">{errand.location}</p>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-4">{errand.description}</p>
                <button
                  onClick={() => handleConfirmErrand(errand.id)}
                  className="w-full bg-errandify-orange hover:bg-opacity-90 text-white font-bold py-2 rounded-lg transition-colors"
                >
                  ✅ Confirm Errand
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        // Step 2: Allocate to Staff
        <div className="space-y-4">
          <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4 mb-4">
            <p className="text-green-900 font-semibold">Step 2: Allocate to Staff</p>
            <p className="text-sm text-green-700 mt-2">Select a staff member to allocate this errand to</p>
            <button
              onClick={() => {
                setConfirmedErrandId(null);
                setSelectedErrandId(null);
              }}
              className="mt-2 text-sm text-green-700 hover:underline"
            >
              ← Back to Errand Selection
            </button>
          </div>

          {selectedErrand && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Errand Details */}
              <div className="bg-white border-2 border-orange-100 rounded-lg p-4">
                <h3 className="font-bold text-lg mb-3 text-errandify-brown">Errand Details</h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-gray-500 text-sm">Title</p>
                    <p className="font-semibold">{selectedErrand.title}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-sm">ID</p>
                    <p className="font-semibold">{selectedErrand.errandId}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-sm">Budget</p>
                    <p className="font-semibold">SGD ${selectedErrand.budget}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-sm">Location</p>
                    <p className="font-semibold">{selectedErrand.location}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-sm">Description</p>
                    <p className="text-sm">{selectedErrand.description}</p>
                  </div>
                </div>
              </div>

              {/* Staff Selection */}
              <div className="space-y-4">
                <div className="bg-white border-2 border-blue-100 rounded-lg p-4">
                  <h3 className="font-bold text-lg mb-3">Select Staff ({staff.length})</h3>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {staff.map(member => (
                      <button
                        key={member.id}
                        onClick={() => setSelectedStaffId(member.id)}
                        className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                          selectedStaffId === member.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-blue-200'
                        }`}
                      >
                        <div className="font-bold text-gray-800">{member.display_name}</div>
                        <div className="text-xs text-gray-600">{member.role}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {selectedStaff && (
                  <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
                    <h4 className="font-bold text-green-900 mb-3">Ready to Allocate</h4>
                    <div className="space-y-2 text-sm mb-4">
                      <div>
                        <span className="text-gray-600">Errand:</span>
                        <span className="font-semibold block">{selectedErrand.title}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Assigned to:</span>
                        <span className="font-semibold block">{selectedStaff.display_name}</span>
                      </div>
                    </div>

                    <button
                      onClick={handleAllocate}
                      className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-2 rounded-lg transition-colors"
                    >
                      ✓ Allocate to Staff
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DoerAllocateErrands;
