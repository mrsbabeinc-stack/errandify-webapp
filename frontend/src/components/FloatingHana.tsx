import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import HanaTaskCreation from './HanaTaskCreation';

interface TaskData {
  title: string;
  description: string;
  category: string;
  location: string;
  fullAddress: string;
  date: string;
  time: string;
  duration: string;
  durationUnit: string;
  budget: string;
  postalCode: string;
  notes: string;
  suggestedSkills?: string[];
  suggestedDescription?: string;
  suggestedNotes?: string;
}

export default function FloatingHana() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [showSOSConfirm, setShowSOSConfirm] = useState(false);
  const [sosLoading, setSosLoading] = useState(false);

  const handleComplete = (taskData: TaskData) => {
    console.log('[FloatingHana] handleComplete called with:', taskData);
    const prefilledJson = encodeURIComponent(JSON.stringify(taskData));
    console.log('[FloatingHana] Navigating with URL:', `/create-errand?prefilled=${prefilledJson.substring(0, 100)}...`);
    navigate(`/create-errand?prefilled=${prefilledJson}`);
    setIsOpen(false);
  };

  const handleClose = () => {
    setIsOpen(false);
    setIsMinimized(false);
  };

  const handleSOS = async () => {
    setSosLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/chat/hana/sos`,
        { conversationId: 'hana-sos' },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      alert('🆘 SOS request sent! Emergency support will be with you shortly.');
      setShowSOSConfirm(false);
    } catch (error) {
      console.error('SOS request failed:', error);
      alert('Failed to send SOS. Please contact support directly.');
    } finally {
      setSosLoading(false);
    }
  };

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <div className="fixed bottom-24 right-6 z-40 flex flex-col items-center gap-2">
          {/* Main Hana Button */}
          <button
            onClick={() => {
              setIsOpen(true);
              setIsMinimized(false);
            }}
            className="w-14 h-14 bg-gradient-to-br from-errandify-orange to-orange-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-110 flex items-center justify-center text-2xl"
            title="Open Hana"
          >
            🤖
          </button>

          {/* Subtle SOS Button */}
          <button
            onClick={() => setShowSOSConfirm(true)}
            className="w-10 h-10 bg-red-500 text-white rounded-full shadow-md hover:shadow-lg transition-all hover:scale-105 flex items-center justify-center text-sm font-bold opacity-75 hover:opacity-100"
            title="Emergency SOS"
          >
            SOS
          </button>
        </div>
      )}

      {/* Hana Modal - Floating */}
      {isOpen && !isMinimized && (
        <div className="fixed bottom-24 right-6 z-50 max-h-96 overflow-hidden">
          {/* Close Button */}
          <button
            onClick={handleClose}
            className="absolute top-2 right-2 z-10 w-6 h-6 bg-gray-200 hover:bg-gray-300 rounded-full flex items-center justify-center text-gray-700 font-bold"
          >
            ✕
          </button>

          {/* Minimize Button */}
          <button
            onClick={() => setIsMinimized(true)}
            className="absolute top-2 right-9 z-10 w-6 h-6 bg-gray-200 hover:bg-gray-300 rounded-full flex items-center justify-center text-gray-700 font-bold text-sm"
          >
            −
          </button>

          <div className="w-80 shadow-2xl rounded-lg bg-white overflow-hidden">
            <HanaTaskCreation
              isOpen={true}
              onClose={handleClose}
              onComplete={handleComplete}
              onSkipToManual={() => {
                navigate('/create-errand');
                setIsOpen(false);
              }}
            />
          </div>
        </div>
      )}

      {/* Minimized State */}
      {isOpen && isMinimized && (
        <button
          onClick={() => setIsMinimized(false)}
          className="fixed bottom-24 right-6 w-14 h-14 bg-gradient-to-br from-errandify-orange to-orange-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-110 flex items-center justify-center text-2xl z-40 ring-2 ring-orange-300"
          title="Open Hana"
        >
          🤖
        </button>
      )}

      {/* SOS Confirmation Modal */}
      {showSOSConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-sm mx-4 shadow-2xl">
            <h2 className="text-2xl font-bold text-red-600 mb-3">🆘 Emergency SOS</h2>
            <p className="text-gray-700 mb-6">
              Are you in need of immediate emergency assistance? This will alert our emergency support team.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowSOSConfirm(false)}
                className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-400 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSOS}
                disabled={sosLoading}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition disabled:opacity-50"
              >
                {sosLoading ? 'Sending...' : 'Send SOS'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
