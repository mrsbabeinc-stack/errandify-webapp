import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
  const [searchParams] = useSearchParams();
  const [isOpen, setIsOpen] = useState(true);
  const selectedCategory = searchParams.get('category');

  const handleComplete = (taskData: TaskData) => {
    // Navigate to create errand with prefilled data
    const prefilledJson = encodeURIComponent(JSON.stringify(taskData));
    // Use window.location to force navigation and prevent page refresh issues
    window.location.href = `/create-errand?prefilled=${prefilledJson}`;
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
      defaultCategory={selectedCategory}
    />
  );
}
