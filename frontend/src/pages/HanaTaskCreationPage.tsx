import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import HanaChatMode from '../components/task-creation/HanaChatMode';
import HanaAudioMode from '../components/task-creation/HanaAudioMode';
import HanaManualMode from '../components/task-creation/HanaManualMode';
import TaskReviewModal from '../components/task-creation/TaskReviewModal';

export type CreationMode = 'chat' | 'audio' | 'manual';

export interface TaskData {
  title: string;
  description: string;
  category: string;
  location: string;
  date: string;
  time: string;
  budget: string;
  notes: string;
}

interface HanaTaskCreationPageProps {
  userRole: 'asker' | 'doer';
}

export default function HanaTaskCreationPage({ userRole }: HanaTaskCreationPageProps) {
  const navigate = useNavigate();
  const [mode, setMode] = useState<CreationMode>('chat');
  const [taskData, setTaskData] = useState<TaskData>({
    title: '',
    description: '',
    category: '',
    location: '',
    date: '',
    time: '',
    budget: '',
    notes: '',
  });
  const [showReview, setShowReview] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [paymentRequired, setPaymentRequired] = useState(false);

  useEffect(() => {
    checkPaymentMethod();
  }, []);

  const checkPaymentMethod = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/user/payment-method`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (!response.data.data.hasPaymentMethod) {
        setPaymentRequired(true);
      }
    } catch (err) {
      console.log('Could not check payment method, assuming setup needed');
      setPaymentRequired(true);
    }
  };

  const handleTaskUpdate = (updates: Partial<TaskData>) => {
    setTaskData((prev) => ({ ...prev, ...updates }));
  };

  const handleReview = () => {
    if (!taskData.title || !taskData.location || !taskData.date) {
      setError('Please fill in: title, location, and date');
      return;
    }
    setError('');
    setShowReview(true);
  };

  const handleConfirmTask = async () => {
    setIsSubmitting(true);
    setError('');

    try {
      // Content filter check
      const filterResponse = await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/ai/content-filter`,
        {
          title: taskData.title,
          description: taskData.description,
        }
      );

      if (filterResponse.data.data.status === 'FLAG') {
        setShowReview(false);
        setError('This task needs review before it goes live. Our team will check it shortly.');
        return;
      }

      // Post the task
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/errands`,
        {
          title: taskData.title,
          description: taskData.description,
          category: taskData.category,
          location: taskData.location,
          budget: parseFloat(taskData.budget) || 0,
          deadline: new Date(`${taskData.date}T${taskData.time}`).toISOString(),
          specialNote: taskData.notes,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      navigate(`/errand/${response.data.data.id}`);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create task');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (paymentRequired) {
    return (
      <div className="min-h-screen bg-errandify-bg flex flex-col items-center justify-center px-4">
        <div className="max-w-sm w-full bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-2xl font-bold text-errandify-brown mb-4">Add Payment Method</h1>
          <p className="text-gray-600 mb-6">
            To post tasks on Errandify, you need to add a payment method to pay for services.
          </p>
          <button
            onClick={() => navigate('/payment-setup')}
            className="w-full bg-errandify-orange text-white py-3 rounded-lg font-bold hover:bg-opacity-90 mb-2"
          >
            Add Payment Method
          </button>
          <button
            onClick={() => navigate(-1)}
            className="w-full border border-gray-300 py-3 rounded-lg font-semibold text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-errandify-bg">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40 px-4 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="text-errandify-orange font-semibold text-sm"
          >
            ← Back
          </button>
          <h1 className="text-lg font-bold text-errandify-brown">Create Task with Hana</h1>
          <div className="w-12"></div>
        </div>
      </div>

      {/* Mode Tabs */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 sticky top-14 z-30">
        <div className="max-w-4xl mx-auto flex gap-2">
          <button
            onClick={() => setMode('chat')}
            className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
              mode === 'chat'
                ? 'bg-errandify-orange text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            💬 Chat
          </button>
          <button
            onClick={() => setMode('audio')}
            className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
              mode === 'audio'
                ? 'bg-errandify-orange text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            🎤 Audio
          </button>
          <button
            onClick={() => setMode('manual')}
            className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
              mode === 'manual'
                ? 'bg-errandify-orange text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            📝 Manual
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-6 pb-20">
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg mb-6">
            {error}
          </div>
        )}

        {mode === 'chat' && (
          <HanaChatMode
            taskData={taskData}
            onTaskUpdate={handleTaskUpdate}
            onReview={handleReview}
          />
        )}

        {mode === 'audio' && (
          <HanaAudioMode
            taskData={taskData}
            onTaskUpdate={handleTaskUpdate}
            onReview={handleReview}
          />
        )}

        {mode === 'manual' && (
          <HanaManualMode
            taskData={taskData}
            onTaskUpdate={handleTaskUpdate}
            onReview={handleReview}
          />
        )}
      </div>

      {/* Review Modal */}
      {showReview && (
        <TaskReviewModal
          taskData={taskData}
          onConfirm={handleConfirmTask}
          onCancel={() => setShowReview(false)}
          isSubmitting={isSubmitting}
        />
      )}
    </div>
  );
}
