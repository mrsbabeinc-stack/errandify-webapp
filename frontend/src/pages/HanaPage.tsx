import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import HanaTaskCreation from '../components/HanaTaskCreation';

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

export default function HanaPage() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(true);

  const handleComplete = (taskData: TaskData) => {
    // Navigate to create errand with prefilled data
    const prefilledJson = encodeURIComponent(JSON.stringify(taskData));
    navigate(`/create-errand?prefilled=${prefilledJson}`);
  };

  const handleClose = () => {
    setIsOpen(false);
    navigate('/home');
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
    />
  );
}
