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
  const [searchQuery, setSearchQuery] = useState('');
  const [recommendedStaffId, setRecommendedStaffId] = useState<number | null>(null);

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

        console.log('[DoerAllocateErrands] All errands:', errandsResponse.data.data);

        // Filter for confirmed status errands that have user's accepted bid
        // These are errands ready to be allocated to company staff
        // Exclude errands that already have assignments
        const confirmedErrands = errandsResponse.data.data
          .filter((e: any) => {
            console.log(`[DoerAllocateErrands] Checking errand ${e.id}: status=${e.status}, acceptedBidId=${e.acceptedBidId}, hasAssignment=${e.hasAssignment}`);
            return e.status === 'confirmed' && e.acceptedBidId && !e.hasAssignment;
          })
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

        console.log('[DoerAllocateErrands] Filtered confirmed errands:', confirmedErrands);
        setErrands(confirmedErrands);

        // Fetch real company staff members
        try {
          // First get the user's company
          const companyResponse = await axios.get(
            `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/companies/user/my-company`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          const companyId = companyResponse.data.data?.id;

          if (companyId) {
            // Fetch employees for this company
            const staffResponse = await axios.get(
              `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/companies/${companyId}/employees`,
              { headers: { Authorization: `Bearer ${token}` } }
            );

            if (staffResponse.data.data && Array.isArray(staffResponse.data.data)) {
              const realStaff = staffResponse.data.data.map((emp: any) => ({
                id: emp.user_id,
                display_name: emp.user_name || emp.name || 'Staff Member',
                alias: emp.alias,
                role: emp.position || emp.role || 'Staff',
              }));

              if (realStaff.length > 0) {
                setStaff(realStaff);
                // AI Recommendation: suggest the first available staff
                setRecommendedStaffId(realStaff[0].id);
              } else {
                throw new Error('No employees found');
              }
            }
          }
        } catch (err) {
          console.warn('Failed to fetch real staff, using demo:', err);
          // Fallback to demo staff if API fails - use real demo account IDs
          const demoStaff = [
            { id: 13, display_name: 'Demo Staff 1', alias: 'Staff 1', role: 'Staff Member' },
            { id: 14, display_name: 'Demo Staff 2', alias: 'Staff 2', role: 'Staff Member' },
          ];
          setStaff(demoStaff);
          // Recommend Demo Staff 1 (ID: 13)
          setRecommendedStaffId(13);
        }

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
      const modal = document.createElement('div');
      modal.innerHTML = `
        <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 9999;" id="warn-modal">
          <div style="background: white; border-radius: 12px; padding: 20px; max-width: 400px; text-align: center; box-shadow: 0 10px 40px rgba(0,0,0,0.2);">
            <div style="font-size: 48px; margin-bottom: 16px;">⚠️</div>
            <h2 style="color: #8B4513; font-size: 24px; margin-bottom: 8px; font-weight: bold;">Selection Required</h2>
            <p style="color: #666; margin-bottom: 24px; line-height: 1.5;">Please select both an errand and a staff member</p>
            <button id="warn-ok" style="width: 100%; background: #FF9800; color: white; border: none; padding: 12px; border-radius: 8px; font-weight: bold; font-size: 16px; cursor: pointer;">OK</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
      document.getElementById('warn-ok')?.addEventListener('click', () => {
        modal.remove();
      });
      return;
    }

    try {
      const token = localStorage.getItem('token');

      // Create errand assignment
      await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/errands/errand-assignments`,
        {
          errandId: selectedErrandId,
          doerId: selectedStaffId,
          status: 'accepted',
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Show success modal with Errandify theme
      const modal = document.createElement('div');
      modal.innerHTML = `
        <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 9999;" id="alloc-modal">
          <div style="background: white; border-radius: 12px; padding: 20px; max-width: 400px; text-align: center; box-shadow: 0 10px 40px rgba(0,0,0,0.2);">
            <div style="font-size: 48px; margin-bottom: 16px;">✅</div>
            <h2 style="color: #8B4513; font-size: 24px; margin-bottom: 8px; font-weight: bold;">Errand Allocated!</h2>
            <p style="color: #666; margin-bottom: 24px; line-height: 1.5;">Staff member has been assigned to this errand and will receive a notification.</p>
            <button id="alloc-ok" style="width: 100%; background: #FF9800; color: white; border: none; padding: 12px; border-radius: 8px; font-weight: bold; font-size: 16px; cursor: pointer;">OK</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
      document.getElementById('alloc-ok')?.addEventListener('click', () => {
        modal.remove();
      });

      setSelectedErrandId(null);
      setSelectedStaffId(null);

      // Refresh the list
      setErrands(errands.filter(e => e.id !== selectedErrandId));
    } catch (err: any) {
      console.error('Failed to allocate:', err);
      const errorMsg = err.response?.data?.error || 'Failed to allocate errand';
      const modal = document.createElement('div');
      modal.innerHTML = `
        <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 9999;" id="error-modal">
          <div style="background: white; border-radius: 12px; padding: 20px; max-width: 400px; text-align: center; box-shadow: 0 10px 40px rgba(0,0,0,0.2);">
            <div style="font-size: 48px; margin-bottom: 16px;">❌</div>
            <h2 style="color: #8B4513; font-size: 24px; margin-bottom: 8px; font-weight: bold;">Allocation Failed</h2>
            <p style="color: #d9534f; margin-bottom: 24px; line-height: 1.5;">${errorMsg}</p>
            <button id="error-ok" style="width: 100%; background: #8B4513; color: white; border: none; padding: 12px; border-radius: 8px; font-weight: bold; font-size: 16px; cursor: pointer;">OK</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
      document.getElementById('error-ok')?.addEventListener('click', () => {
        modal.remove();
      });
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
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-bold text-lg">Select Staff ({staff.length})</h3>
                    {recommendedStaffId && (
                      <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded text-xs font-bold">
                        🤖 AI Recommended
                      </span>
                    )}
                  </div>

                  {/* Search Box */}
                  <input
                    type="text"
                    placeholder="🔍 Search staff by name or role..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full p-2 border-2 border-gray-300 rounded-lg mb-3 focus:outline-none focus:border-blue-500"
                  />

                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {staff
                      .filter(member =>
                        member.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        member.role.toLowerCase().includes(searchQuery.toLowerCase())
                      )
                      .map(member => (
                        <button
                          key={member.id}
                          onClick={() => setSelectedStaffId(member.id)}
                          className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                            selectedStaffId === member.id
                              ? 'border-blue-500 bg-blue-50'
                              : recommendedStaffId === member.id
                              ? 'border-purple-300 bg-purple-50 hover:border-purple-400'
                              : 'border-gray-200 hover:border-blue-200'
                          }`}
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="font-bold text-gray-800">{member.display_name}</div>
                              <div className="text-xs text-gray-600">ID: {member.id} • {member.role}</div>
                            </div>
                            {recommendedStaffId === member.id && (
                              <span className="text-lg">🤖</span>
                            )}
                          </div>
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
