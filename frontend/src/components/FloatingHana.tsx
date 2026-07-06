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
  // Floating Hana removed - users access Hana through the "+Create Errand" button
  return null;
}
