import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import HanaTaskCreation from './HanaTaskCreation';

interface TaskData {
  title: string;
  description: string;
  category: string;
  location: string;
  area: string;
  fullAddress: string;
  date: string;
  time: string;
  duration: string;
  durationUnit: string;
  budget: string;
  postalCode: string;
  notes: string;
}

interface AskerPostErrandProps {
  onClose?: () => void;
  onPostComplete?: () => void;
}

const AskerPostErrand: React.FC<AskerPostErrandProps> = ({ onClose, onPostComplete }) => {
  const navigate = useNavigate();
  const [isOpen] = useState(true);

  const handleComplete = (taskData: TaskData) => {
    console.log('[AskerPostErrand] handleComplete called with:', taskData);
    // Navigate to create errand with prefilled data
    const prefilledJson = encodeURIComponent(JSON.stringify(taskData));
    let targetUrl = `/create-errand?prefilled=${prefilledJson}`;
    if (onPostComplete) {
      targetUrl += '&onPostComplete=true';
    }
    console.log('[AskerPostErrand] Navigating to:', targetUrl);
    navigate(targetUrl);
  };

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      navigate(-1);
    }
  };

  const handleSkipToManual = () => {
    navigate('/create-errand');
  };

  return (
    <HanaTaskCreation
      isOpen={isOpen}
      onClose={handleClose}
      onComplete={handleComplete}
      onSkipToManual={handleSkipToManual}
      defaultCategory=""
    />
  );
};

export default AskerPostErrand;
