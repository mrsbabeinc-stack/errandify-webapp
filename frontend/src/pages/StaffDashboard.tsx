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
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'active' | 'completed'>('pending');
  const [tasks, setTasks] = useState<AllocatedTask[]>([]);
  const [completedTasks, setCompletedTasks] = useState<CompletedTask[]>([]);
  const [selectedTask, setSelectedTask] = useState<AllocatedTask | null>(null);
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [declineReason, setDeclineReason] = useState('');
  const [declineNotes, setDeclineNotes] = useState('');

  useEffect(() => {
    fetchTasks();
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
      console.error('Error fetching tasks:', error);
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
      console.error('Error starting task:', error);
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
      console.error('Error declining task:', error);
    }
  };

  if (loading) {
    return (
      <div className="staff-dashboard loading">
        <div className="loading-spinner">Loading your tasks...</div>
      </div>
    );
  }

  return (
    <div className="staff-dashboard">
      <div className="dashboard-header">
        <h1>My Work</h1>
        <p>Manage your allocated tasks and completed work</p>
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
        {activeTab === 'pending' && (
          <div className="tasks-section">
            {tasks.filter(t => t.status === 'pending').length === 0 ? (
              <div className="empty-state">
                <p>No pending tasks. Great job staying on top of things!</p>
              </div>
            ) : (
              <div className="tasks-grid">
                {tasks.filter(t => t.status === 'pending').map(task => (
                  <div key={task.id} className="task-card pending">
                    <h3>{task.title}</h3>
                    <p className="task-description">{task.description}</p>
                    <div className="task-details">
                      <div>Location: {task.location}</div>
                      <div>Budget: ${task.budget}</div>
                      <div>Deadline: {new Date(task.deadline).toLocaleDateString()}</div>
                    </div>
                    <div className="task-actions">
                      <button onClick={() => handleStartTask(task)}>Start Errand</button>
                      <button onClick={() => {
                        setSelectedTask(task);
                        setShowDeclineModal(true);
                      }}>Decline</button>
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
            <h2>Decline Task</h2>
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
    </div>
  );
};

export default StaffDashboard;
