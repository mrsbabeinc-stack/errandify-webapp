import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/StaffDashboard.css';

interface AllocatedTask {
  id: number;
  errand_id: string;
  title: string;
  description: string;
  location: string;
  area: string;
  budget: number;
  deadline: string;
  status: 'pending' | 'active' | 'completed';
  asker_name: string;
  asker_type: 'individual' | 'company';
}

interface CompletedTask {
  id: number;
  errand_id: string;
  title: string;
  rating: number;
  review_text: string;
  completed_at: string;
}

const StaffDashboard: React.FC = () => {
  const navigate = useNavigate();
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'pending' | 'active' | 'completed'>('pending');
  const [tasks, setTasks] = useState<AllocatedTask[]>([
    {
      id: 1,
      errand_id: 'ERR001',
      title: 'Grocery Shopping',
      description: 'Buy groceries for household including vegetables, milk, and bread',
      location: 'Tanjong Pagar',
      area: 'Central',
      budget: 50,
      deadline: '2026-07-15',
      status: 'pending',
      asker_name: 'Sarah Tan',
      asker_type: 'individual',
    },
    {
      id: 2,
      errand_id: 'ERR002',
      title: 'Package Delivery',
      description: 'Deliver package to Bedok area',
      location: 'Bedok',
      area: 'East',
      budget: 35,
      deadline: '2026-07-14',
      status: 'active',
      asker_name: 'ABC Company',
      asker_type: 'company',
    },
  ]);
  const [completedTasks, setCompletedTasks] = useState<CompletedTask[]>([
    {
      id: 3,
      errand_id: 'ERR003',
      title: 'Help with moving',
      rating: 5,
      review_text: 'Excellent service! Very professional and quick.',
      completed_at: '2026-07-10',
    },
  ]);
  const [selectedTask, setSelectedTask] = useState<AllocatedTask | null>(null);
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [declineReason, setDeclineReason] = useState('');
  const [declineNotes, setDeclineNotes] = useState('');

  useEffect(() => {
    // Load real tasks from backend if token exists
    const token = localStorage.getItem('token');
    if (token) {
      fetchTasks();
    } else {
      // Use mock data if no token (demo mode)
      setLoading(false);
    }
  }, []);

  const fetchTasks = async () => {
    try {
      const token = localStorage.getItem('token');

      // Get allocated tasks
      const response = await fetch(`${API_URL}/api/errands?myAllocated=true`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        const allocated = data.data || [];

        // Separate by status
        const pending = allocated.filter((t: AllocatedTask) => t.status === 'pending');
        const active = allocated.filter((t: AllocatedTask) => t.status === 'active');

        setTasks([...pending, ...active]);
      }

      // Get completed tasks
      const completedResponse = await fetch(`${API_URL}/api/errands?myCompleted=true`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (completedResponse.ok) {
        const data = await completedResponse.json();
        setCompletedTasks(data.data || []);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error fetching errands:', error);
      // Keep using mock data on error
      setLoading(false);
    }
  };

  const handleStartTask = async (task: AllocatedTask) => {
    try {
      const token = localStorage.getItem('token');

      const response = await fetch(`${API_URL}/api/errands/${task.id}/start`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        navigate(`/errand/${task.id}`);
      }
    } catch (error) {
      console.error('Error starting errand:', error);
    }
  };

  const handleDecline = async () => {
    if (!selectedTask || !declineReason) return;

    try {
      const token = localStorage.getItem('token');

      const response = await fetch(`${API_URL}/api/errands/${selectedTask.id}/errand-decline`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reason: declineReason,
          notes: declineNotes,
        }),
      });

      if (response.ok) {
        setShowDeclineModal(false);
        setDeclineReason('');
        setDeclineNotes('');
        setSelectedTask(null);
        fetchTasks();
      }
    } catch (error) {
      console.error('Error declining errand:', error);
    }
  };

  if (loading) {
    return (
      <div className="staff-dashboard loading">
        <div className="loading-spinner">Loading your errands...</div>
      </div>
    );
  }

  return (
    <div className="staff-dashboard" style={{ paddingTop: 0 }}>
      {/* MINIMAL HEADER - Just navigation and title */}
      <div style={{ padding: '20px', borderBottom: '1px solid #e0e0e0', background: 'white' }}>
        <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#333', margin: '0 0 4px 0' }}>My Work</h2>
        <p style={{ fontSize: '13px', color: '#999', margin: 0 }}>Manage your errands</p>
      </div>

      <div className="tabs">
        <button
          className={`tab ${activeTab === 'pending' ? 'active' : ''}`}
          onClick={() => setActiveTab('pending')}
        >
          Pending ({tasks.filter(t => t.status === 'pending').length})
        </button>
        <button
          className={`tab ${activeTab === 'active' ? 'active' : ''}`}
          onClick={() => setActiveTab('active')}
        >
          Active ({tasks.filter(t => t.status === 'active').length})
        </button>
        <button
          className={`tab ${activeTab === 'completed' ? 'active' : ''}`}
          onClick={() => setActiveTab('completed')}
        >
          Completed ({completedTasks.length})
        </button>
      </div>

      <div className="tab-content">
        {/* PENDING TAB */}
        {activeTab === 'pending' && (
          <div className="tasks-section">
            {tasks.filter(t => t.status === 'pending').length === 0 ? (
              <div className="empty-state">
                <p>📭 No pending errands. Great job staying on top of things!</p>
              </div>
            ) : (
              <div className="tasks-grid">
                {tasks.filter(t => t.status === 'pending').map(task => (
                  <div key={task.id} className="task-card pending">
                    <h3>{task.title}</h3>
                    <p className="task-description">{task.description}</p>
                    <div className="task-details">
                      <div>📍 Location: {task.location}</div>
                      <div>💰 Budget: ${task.budget}</div>
                      <div>📅 Deadline: {new Date(task.deadline).toLocaleDateString()}</div>
                    </div>
                    <div className="task-actions">
                      <button onClick={() => handleStartTask(task)} className="btn-accept">✅ Start Errand</button>
                      <button onClick={() => {
                        setSelectedTask(task);
                        setShowDeclineModal(true);
                      }} className="btn-decline">❌ Decline</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ACTIVE TAB */}
        {activeTab === 'active' && (
          <div className="tasks-section">
            {tasks.filter(t => t.status === 'active').length === 0 ? (
              <div className="empty-state">
                <p>🚀 No active errands right now. Browse errands to start working!</p>
              </div>
            ) : (
              <div className="tasks-grid">
                {tasks.filter(t => t.status === 'active').map(task => (
                  <div key={task.id} className="task-card active">
                    <div className="task-status-badge">🔄 In Progress</div>
                    <h3>{task.title}</h3>
                    <p className="task-description">{task.description}</p>
                    <div className="task-details">
                      <div>📍 Location: {task.location}</div>
                      <div>💰 Budget: ${task.budget}</div>
                      <div>📅 Deadline: {new Date(task.deadline).toLocaleDateString()}</div>
                      <div>👤 From: {task.asker_name}</div>
                    </div>
                    <div className="task-actions">
                      <button onClick={() => navigate(`/errand/${task.id}`)} className="btn-primary">📝 View & Update</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* COMPLETED TAB */}
        {activeTab === 'completed' && (
          <div className="tasks-section">
            {completedTasks.length === 0 ? (
              <div className="empty-state">
                <p>✨ No completed errands yet. Keep working to build your reputation!</p>
              </div>
            ) : (
              <div className="tasks-grid">
                {completedTasks.map(task => (
                  <div key={task.id} className="task-card completed">
                    <div className="task-status-badge completed">✅ Completed</div>
                    <h3>{task.title}</h3>
                    <div className="task-details">
                      <div>⭐ Rating: {task.rating}/5</div>
                      <div>📅 Completed: {new Date(task.completed_at).toLocaleDateString()}</div>
                      {task.review_text && (
                        <div className="review-text">
                          <p className="review-label">💬 Review:</p>
                          <p>"{task.review_text}"</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {showDeclineModal && selectedTask && (
        <div className="modal-overlay" onClick={() => setShowDeclineModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2>Decline Errand</h2>
            <select
              value={declineReason}
              onChange={e => setDeclineReason(e.target.value)}
            >
              <option value="">Select a reason...</option>
              <option value="too_busy">Too busy</option>
              <option value="health">Health issue</option>
              <option value="family">Family emergency</option>
              <option value="vehicle">Vehicle problem</option>
              <option value="other">Other</option>
            </select>
            <button onClick={handleDecline} disabled={!declineReason}>Decline</button>
            <button onClick={() => setShowDeclineModal(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* FOOTER - Apply for Leave - Minimal */}
      <div style={{ padding: '30px 20px', textAlign: 'center', borderTop: '1px solid #e0e0e0', background: '#f9f9f9' }}>
        <button
          onClick={() => navigate('/my-account')}
          style={{
            padding: '12px 28px',
            background: 'linear-gradient(135deg, #FF6B35 0%, #FF8C5A 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontWeight: '600',
            fontSize: '0.95em',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.boxShadow = '0 4px 12px rgba(255, 107, 53, 0.3)')}
          onMouseLeave={(e) => (e.currentTarget.style.boxShadow = 'none')}
        >
          📅 Apply for Leave
        </button>
      </div>
    </div>
  );
};

export default StaffDashboard;
