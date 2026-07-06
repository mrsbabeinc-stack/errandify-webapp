import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import HanaTaskCreation from '../components/HanaTaskCreation';

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
  suggestedSkills?: string[];
  suggestedDescription?: string;
  suggestedNotes?: string;
}

export default function HanaPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isOpen, setIsOpen] = useState(true);
  const selectedCategory = searchParams.get('category');

  const handleComplete = (taskData: TaskData) => {
    console.log('[HanaPage] handleComplete called with:', taskData);
    // Navigate to create errand with prefilled data
    const prefilledJson = encodeURIComponent(JSON.stringify(taskData));
    const targetUrl = `/create-errand?prefilled=${prefilledJson}`;
    console.log('[HanaPage] Navigating to:', targetUrl);
    // Use navigate from react-router
    navigate(targetUrl);
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
