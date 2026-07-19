import React, { useState, useEffect } from 'react';
import '../styles/ManagerStaffAllocations.css';

interface StaffAllocation {
  id: number;
  staff_name: string;
  errand_title: string;
  errand_id: string;
  status: 'allocated' | 'accepted' | 'declined' | 'completed';
  allocated_at: string;
  decline_reason?: string;
}

interface ManagerStaffAllocationsProps {
  companyId: number;
  defaultFilter?: 'all' | 'allocated' | 'accepted' | 'declined';
}

const ManagerStaffAllocations: React.FC<ManagerStaffAllocationsProps> = ({ companyId, defaultFilter = 'all' }) => {
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
  const [allocations, setAllocations] = useState<StaffAllocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'allocated' | 'accepted' | 'declined'>(defaultFilter);

  useEffect(() => {
    fetchAllocations();
  }, [companyId]);

  const fetchAllocations = async () => {
    try {
      const token = localStorage.getItem('token');

      const response = await fetch(
        `${API_URL}/api/company/${companyId}/allocations`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setAllocations(data.allocations || []);
      } else {
        // Fallback to mock data if API fails
        setAllocations(getMockAllocations());
      }

      setLoading(false);
    } catch (error) {
      console.error('Error fetching allocations:', error);
      // Fallback to mock data if API fails
      setAllocations(getMockAllocations());
      setLoading(false);
    }
  };

  const getMockAllocations = (): StaffAllocation[] => [
    {
      id: 1,
      staff_name: 'Sarah Johnson',
      errand_title: 'Garden Cleaning & Landscaping',
      errand_id: 'ERR-2026-001',
      status: 'accepted',
      allocated_at: '2026-07-14T08:30:00Z',
    },
    {
      id: 2,
      staff_name: 'Mike Chen',
      errand_title: 'House Painting - Living Room',
      errand_id: 'ERR-2026-002',
      status: 'allocated',
      allocated_at: '2026-07-14T09:15:00Z',
    },
    {
      id: 3,
      staff_name: 'Lisa Wong',
      errand_title: 'Furniture Assembly & Setup',
      errand_id: 'ERR-2026-003',
      status: 'accepted',
      allocated_at: '2026-07-13T14:00:00Z',
    },
    {
      id: 4,
      staff_name: 'David Lee',
      errand_title: 'Window Cleaning Service',
      errand_id: 'ERR-2026-004',
      status: 'declined',
      allocated_at: '2026-07-14T10:20:00Z',
      decline_reason: 'Schedule conflict',
    },
    {
      id: 5,
      staff_name: 'Emma Davis',
      errand_title: 'Carpet Cleaning - Upstairs',
      errand_id: 'ERR-2026-005',
      status: 'accepted',
      allocated_at: '2026-07-12T16:45:00Z',
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'allocated':
        return 'pending';
      case 'accepted':
        return 'active';
      case 'declined':
        return 'declined';
      case 'completed':
        return 'completed';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'allocated':
        return '⏳ Pending';
      case 'accepted':
        return '✓ Accepted';
      case 'declined':
        return '❌ Declined';
      case 'completed':
        return '✅ Completed';
      default:
        return status;
    }
  };

  const filteredAllocations = filter === 'all' 
    ? allocations 
    : allocations.filter(a => a.status === filter);

  if (loading) {
    return <div className="manager-allocations loading">Loading allocations...</div>;
  }

  return (
    <div className="manager-allocations">
      <h3>👥 Staff Task Allocations</h3>

      <div className="filter-tabs">
        {(['all', 'allocated', 'accepted', 'declined'] as const).map(status => (
          <button
            key={status}
            className={`filter-tab ${filter === status ? 'active' : ''}`}
            onClick={() => setFilter(status)}
          >
            {status === 'all' ? `All (${allocations.length})` : 
             status === 'allocated' ? `Pending (${allocations.filter(a => a.status === 'allocated').length})` :
             status === 'accepted' ? `Accepted (${allocations.filter(a => a.status === 'accepted').length})` :
             `Declined (${allocations.filter(a => a.status === 'declined').length})`}
          </button>
        ))}
      </div>

      {filteredAllocations.length === 0 ? (
        <div className="empty-state">
          <p>✨ No allocations in this category</p>
        </div>
      ) : (
        <div className="allocations-table">
          <div className="table-header">
            <div className="col-staff">STAFF MEMBER</div>
            <div className="col-task">ERRAND</div>
            <div className="col-status">STATUS</div>
          </div>

          {filteredAllocations.map(allocation => (
            <div key={allocation.id} className="table-row">
              <div className="col-staff">{allocation.staff_name}</div>
              <div className="col-task">
                <strong>{allocation.errand_title}</strong>
                <span className="errand-id">#{allocation.errand_id}</span>
              </div>
              <div className={`col-status ${getStatusColor(allocation.status)}`}>
                {getStatusLabel(allocation.status)}
              </div>
              <div className="col-date">
                {new Date(allocation.allocated_at).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ManagerStaffAllocations;
