import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
}

export default function FloatingHana() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  const handleComplete = (taskData: TaskData) => {
    const prefilledJson = encodeURIComponent(JSON.stringify(taskData));
    navigate(`/create-errand?prefilled=${prefilledJson}`);
    setIsOpen(false);
  };

  const handleClose = () => {
    setIsOpen(false);
    setIsMinimized(false);
  };

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={() => {
            setIsOpen(true);
            setIsMinimized(false);
          }}
          className="fixed bottom-24 right-6 w-14 h-14 bg-gradient-to-br from-errandify-orange to-orange-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-110 flex items-center justify-center text-2xl z-40"
          title="Open Hana"
        >
          🤖
        </button>
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
    </>
  );
}
