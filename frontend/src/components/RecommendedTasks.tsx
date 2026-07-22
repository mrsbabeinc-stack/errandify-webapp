import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

interface Task {
  id: number;
  title: string;
  budget: number;
  category: string;
  location: string;
  deadline: string;
  status: string;
}

export default function RecommendedTasks() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecommendations();
  }, []);

  const fetchRecommendations = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/errands/recommended`,
        {
          headers: { Authorization: `Bearer ${token}` },
          params: { limit: 5 },
        }
      );

      if (response.data.data && response.data.data.length > 0) {
        setTasks(response.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch recommendations:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading || tasks.length === 0) {
    return null;
  }

  return (
    <div className="mt-8 mb-6">
      <h2 className="text-lg font-bold text-errandify-brown mb-4 flex items-center gap-2">
        <span>✨ Recommended For You</span>
      </h2>

      <div className="grid grid-cols-1 gap-3">
        {tasks.map(task => (
          <div
            key={task.id}
            className="bg-white rounded-lg p-4 border border-gray-200 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <h3 className="font-semibold text-errandify-brown text-sm">{task.title}</h3>
                <p className="text-xs text-gray-600 mt-1">
                  📍 {task.location}
                </p>
              </div>
              <span className="text-lg font-bold text-errandify-orange">
                SGD ${Math.round(task.budget)}
              </span>
            </div>

            <div className="flex items-center gap-4 mb-3">
              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                {task.category}
              </span>
              <span className="text-xs text-gray-500">
                🕐 {new Date(task.deadline).toLocaleDateString()}
              </span>
            </div>

            <button
              onClick={() => navigate(`/errand/${task.id}`)}
              className="w-full bg-errandify-orange text-white py-2 rounded font-semibold text-sm hover:bg-opacity-90"
            >
              View & Offer
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
