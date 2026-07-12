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

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setError('Not authenticated');
          setLoading(false);
          return;
        }

        // Fetch confirmed errands (those with accepted bids, ready for allocation)
        const errandsResponse = await axios.get(
          `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/errands`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        // Filter for confirmed status errands (those with accepted bids)
        const confirmedErrands = errandsResponse.data.data
          .filter((e: any) => e.status === 'confirmed' || (e.status === 'open' && e.bidCount > 0))
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

        // Fetch company staff members (if company context available)
        // For now, this would need to be called from company API
        // This is a placeholder - in full implementation, get from /api/companies/staff
        setStaff([
          { id: 1, display_name: 'Support L3 Senior', alias: 'Support L3', role: 'Senior Staff' },
          { id: 2, display_name: 'Support L2 Agent', alias: 'Support L2', role: 'Support Agent' },
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
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Errands Column */}
          <div className="bg-white border-2 border-orange-100 rounded-lg p-4">
            <h3 className="font-bold text-lg mb-3">Pending Errands ({errands.length})</h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {errands.map(errand => (
                <button
                  key={errand.id}
                  onClick={() => setSelectedErrandId(errand.id)}
                  className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                    selectedErrandId === errand.id
                      ? 'border-errandify-orange bg-orange-50'
                      : 'border-gray-200 hover:border-orange-200'
                  }`}
                >
                  <div className="font-bold text-errandify-brown">{errand.title}</div>
                  <div className="text-xs text-gray-600 mt-1">{errand.errandId}</div>
                  <div className="text-sm text-gray-700 mt-1">
                    <span className="font-semibold">SGD ${errand.budget}</span> • {errand.location}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Selection Panel */}
          <div className="space-y-4">
            {/* Staff Column */}
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

            {/* Summary */}
            {selectedErrand && selectedStaff && (
              <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
                <h4 className="font-bold text-green-900 mb-3">Allocation Summary</h4>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-gray-600">Errand:</span>
                    <span className="font-semibold block">{selectedErrand.title}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Assigned to:</span>
                    <span className="font-semibold block">{selectedStaff.display_name}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Budget:</span>
                    <span className="font-semibold block">SGD ${selectedErrand.budget}</span>
                  </div>
                </div>

                <button
                  onClick={handleAllocate}
                  className="w-full mt-4 bg-green-500 hover:bg-green-600 text-white font-bold py-2 rounded-lg transition-colors"
                >
                  ✓ Confirm Allocation
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DoerAllocateErrands;
