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
        `${API_URL}/api/companies/${companyId}/allocations`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setAllocations(data.allocations || []);
      } else {
        // No invented rows here: a manager reading fabricated assignments
        // would believe work is covered when nobody holds it.
        setAllocations([]);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error fetching allocations:', error);
      setAllocations([]);
      setLoading(false);
    }
  };

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
      <h3>👥 Staff Errand Allocations</h3>

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
