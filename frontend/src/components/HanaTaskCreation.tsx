import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import HanaAnimatedAvatar from './HanaAnimatedAvatar';

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

type CollectionStep = 'input' | 'confirm' | 'complete';

interface HanaTaskCreationProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (taskData: TaskData) => void;
  onSkipToManual?: () => void;
}

export default function HanaTaskCreation({
  isOpen,
  onClose,
  onComplete,
  onSkipToManual,
}: HanaTaskCreationProps) {
  const [currentStep, setCurrentStep] = useState<CollectionStep>('input');
  const [taskData, setTaskData] = useState<TaskData>({
    title: '',
    description: '',
    category: '',
    location: '',
    fullAddress: '',
    date: '',
    time: '',
    duration: '',
    durationUnit: 'Hr',
    budget: '',
    postalCode: '',
    notes: '',
  });
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [hanaMessage, setHanaMessage] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    if (isOpen && !hanaMessage) {
      initializeChat();
    }
  }, [isOpen]);

  const initializeChat = () => {
    setHanaMessage("Hi! What errand do you need help with?\n\nExample:\n'Clean my house at 680433 on Saturday for 2 hours at 2pm, budget $100'");
    setCurrentStep('input');
    triggerSpeaking();
  };

  const triggerSpeaking = () => {
    // Voice disabled - removed
    setIsSpeaking(false);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userInput = input.trim();
    setInput('');
    setLoading(true);

    try {
      // Send user input to AI to extract all info at once
      await extractTaskInfo(userInput);
    } catch (error) {
      console.error('Chat error:', error);
      setHanaMessage('Sorry, I had trouble understanding. Can you try again?');
    } finally {
      setLoading(false);
    }
  };

  const extractTaskInfo = async (userInput: string) => {
    try {
      // First, check if the input contains inappropriate content
      try {
        const contentCheckResponse = await axios.post(
          `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/ai/check-content`,
          {
            title: userInput,
            description: '',
            notes: '',
          }
        );

        if (!contentCheckResponse.data.data.is_safe) {
          console.log('[Hana] Content check failed - inappropriate content detected');
          setHanaMessage('I cannot help with that request. It contains inappropriate content. Please describe your errand in a different way. 😊');
          setCurrentStep('input');
          setInput('');
          setLoading(false);
          return;
        }
      } catch (contentCheckErr) {
        console.warn('[Hana] Content check error:', contentCheckErr);
        // Continue anyway if content check fails - don't block the user
      }

      // Use AI to extract structured task info from freeform input
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/ai/extract-task-info`,
        { input: userInput }
      );

      console.log('Extract response:', response.data);
      const extracted = response.data.data;
      console.log('[Hana] Extracted budget:', extracted.budget, 'type:', typeof extracted.budget);

      // Update task data with extracted info
      const updatedTaskData: TaskData = {
        title: extracted.title || userInput.substring(0, 50),
        description: extracted.description || '',
        category: extracted.category || '',
        location: extracted.location || '',
        fullAddress: extracted.fullAddress || extracted.location || '',
        date: extracted.date || '',
        time: extracted.time || '10:00',
        duration: extracted.duration || '',
        durationUnit: extracted.durationUnit || 'Hr',
        budget: extracted.budget ? String(extracted.budget) : '',
        postalCode: extracted.postalCode || '',
        notes: extracted.notes || '',
        suggestedSkills: extracted.suggestedSkills || [],
      };

      setTaskData(updatedTaskData);

      // Check if budget is missing
      if (!updatedTaskData.budget || updatedTaskData.budget.trim() === '') {
        setHanaMessage('I need a budget amount to post this. How much are you willing to pay? (e.g., 50, 100, 200) 💰');
        setCurrentStep('input');
        setInput('');
        return;
      }

      // Get AI suggestions for this category
      try {
        console.log('[Hana] Requesting suggestions for:', updatedTaskData.category);
        const suggestionsResponse = await axios.post(
          `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/ai/suggestions`,
          {
            title: updatedTaskData.title,
            description: updatedTaskData.description,
            category: updatedTaskData.category,
            date: updatedTaskData.date,
            time: updatedTaskData.time,
          }
        );

        console.log('[Hana] Suggestions response:', suggestionsResponse.data);

        const suggestions = suggestionsResponse.data.data;
        // Don't auto-fill description and notes - just send the suggestion data separately
        // Form will show these as suggestion boxes for user to click and apply
        const enhancedTaskData = {
          ...updatedTaskData,
          description: '', // Keep empty - user will click "Use" button to apply
          notes: '', // Keep empty - user will click "Use" button to apply
          suggestedSkills: suggestions.skills || [],
          // These will be passed to form via aiSuggestions state
          suggestedDescription: suggestions.description,
          suggestedNotes: suggestions.notes,
        };

        console.log('[Hana] Enhanced task data to send:', enhancedTaskData);

        // Validate date and time before proceeding
        if (!enhancedTaskData.date || !enhancedTaskData.time) {
          setHanaMessage('I need the date and time to help you. Could you tell me again when you need help? 🥺');
          return;
        }

        // Check if date is in the past
        const errandDate = new Date(enhancedTaskData.date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (errandDate < today) {
          setHanaMessage('That date is in the past. Please give me a future date and I will process it again. What date would you like? 😊');
          setCurrentStep('input');
          setInput('');
          return;
        }

        // Check if date/time is at least 30 minutes from now
        const errandDateTime = new Date(`${enhancedTaskData.date}T${enhancedTaskData.time}`);
        const now = new Date();
        const thirtyMinutesFromNow = new Date(now.getTime() + 30 * 60 * 1000);

        if (errandDateTime < thirtyMinutesFromNow) {
          setHanaMessage('I need at least 30 minutes from now to find someone to help you. Please give me a later time. 🙏');
          setCurrentStep('input');
          setInput('');
          return;
        }

        setTaskData(enhancedTaskData as any);

        // Auto-proceed to form
        setHanaMessage('✅ Got it! Taking you to the form now...');
        triggerSpeaking();

        // Auto-fill form and proceed after a short delay
        setTimeout(() => {
          console.log('[Hana] Calling onComplete with:', enhancedTaskData);
          onComplete(enhancedTaskData as any);
        }, 1000);
      } catch (err) {
        console.error('Failed to get suggestions:', err);
        // Proceed anyway without suggestions
        setHanaMessage('✅ Got it! Taking you to the form now...');
        triggerSpeaking();

        setTimeout(() => {
          onComplete(updatedTaskData);
        }, 1000);
      }
    } catch (err: any) {
      console.error('Extraction error:', err);
      const errorMsg = err.response?.data?.error || err.message || 'Unknown error';
      console.log('Full error:', errorMsg);
      setHanaMessage(`Sorry, I had trouble understanding that. Error: ${errorMsg}\n\nPlease try again with: what you need, where, when, and budget.`);
    }
  };

  const buildSummary = (data: TaskData) => {
    let summary = '✓ Task Summary:\n\n';
    if (data.title) summary += `📝 ${data.title}\n`;
    if (data.location) summary += `📍 ${data.location}\n`;
    if (data.date) {
      const dateStr = new Date(data.date).toLocaleDateString('en-SG');
      summary += `📅 ${dateStr}`;
      if (data.time) summary += ` at ${data.time}`;
      summary += '\n';
    }
    if (data.budget) summary += `💰 SGD $${data.budget}\n`;
    if (data.notes) summary += `📌 ${data.notes}`;
    return summary;
  };

  const handleConfirmAndProceed = async () => {
    setLoading(true);
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
        setHanaMessage('⚠️ This task needs review. Our team will check it shortly.');
        return;
      }

      // Get AI suggestions before closing
      try {
        const suggestionsResponse = await axios.post(
          `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/ai/suggestions`,
          {
            title: taskData.title,
            description: taskData.description,
            category: taskData.category,
            date: taskData.date,
            time: taskData.time,
          }
        );

        const suggestions = suggestionsResponse.data.data;
        setTaskData((prev) => ({
          ...prev,
          category: suggestions.category || prev.category,
          description: suggestions.description || prev.description,
          budget: suggestions.suggestedBudget?.toString() || prev.budget,
          notes: suggestions.notes || prev.notes,
        }));
      } catch (err) {
        console.log('Could not fetch suggestions');
      }

      setHanaMessage('✅ Perfect! Let me fill in the form for you...');
      triggerSpeaking();

      // Auto-fill form and proceed after a short delay
      setTimeout(() => {
        onComplete(taskData);
      }, 2000);
    } catch (err: any) {
      setHanaMessage(`❌ ${err.response?.data?.error || 'Failed to process'}`);
    } finally {
      setLoading(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Microphone access denied:', err);
      alert('Please allow microphone access to use voice input');
    }
  };

  const stopRecording = async () => {
    if (!mediaRecorderRef.current) return;

    mediaRecorderRef.current.stop();
    setIsRecording(false);

    mediaRecorderRef.current.onstop = async () => {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });

      // Convert to base64 and send to Qwen API for transcription
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Audio = (reader.result as string).split(',')[1];

        try {
          const response = await axios.post(
            `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/ai/transcribe`,
            { audio: base64Audio }
          );

          const transcribedText = response.data.data.text;
          setInput(transcribedText);

          // Auto-submit the transcribed text
          setTimeout(() => {
            handleSendMessage({ preventDefault: () => {} } as any);
          }, 500);
        } catch (err) {
          console.error('Transcription failed:', err);
          alert('Could not transcribe audio. Please try again.');
        }
      };

      reader.readAsDataURL(audioBlob);
    };

    // Stop all tracks
    mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-end justify-center p-0">
      {/* Compact Half-Page Modal */}
      <div className="bg-white rounded-t-3xl shadow-2xl w-full h-[95vh] max-w-2xl flex flex-col overflow-hidden">
        {/* Header - Compact */}
        <div className="bg-errandify-orange px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div>
            <h1 className="text-xl font-bold text-white">Hana (Your AI Sister)</h1>
            <p className="text-orange-100 text-xs">Chat With Hana</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={onSkipToManual}
              className="text-sm text-white hover:text-orange-100 underline font-medium"
              title="Skip to manual form"
            >
              Manual Input
            </button>
            <button
              onClick={onClose}
              className="text-white hover:text-orange-100 text-2xl font-light"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Main Content - Compact Layout */}
        <div className="flex-1 overflow-y-auto flex flex-col">
          {/* Top Section: Speech Bubble */}
          {hanaMessage && (
            <div className="px-6 pt-1 flex-shrink-0">
              <div className="relative animate-slideDown max-w-sm mx-auto"
                   style={{
                     background: 'linear-gradient(135deg, #FFF8F0 0%, #FFE8D6 100%)',
                     border: '1.5px solid #FF8C42',
                     borderRadius: '16px',
                     padding: '10px 12px',
                     boxShadow: '0 4px 8px rgba(255, 140, 66, 0.12), 0 1px 2px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255, 255, 255, 0.5)',
                     transform: 'perspective(1000px) rotateX(2deg)',
                   }}>
                <p className="text-center whitespace-pre-line text-xs font-medium"
                   style={{color: '#5C4033', fontFamily: "'Inter', 'Segoe UI', sans-serif", lineHeight: '1.4', letterSpacing: '0px', fontSize: '12px'}}>
                  {hanaMessage}
                </p>
                {/* Speech bubble tail */}
                <div style={{
                  position: 'absolute',
                  bottom: '-6px',
                  left: '20px',
                  width: '0',
                  height: '0',
                  borderLeft: '6px solid transparent',
                  borderRight: '0 solid transparent',
                  borderTop: '6px solid #FF8C42',
                }} />
                <div style={{
                  position: 'absolute',
                  bottom: '-5px',
                  left: '21px',
                  width: '0',
                  height: '0',
                  borderLeft: '5px solid transparent',
                  borderRight: '0 solid transparent',
                  borderTop: '5px solid #FFF8F0',
                }} />
              </div>
            </div>
          )}

          {/* Middle Section: Hana Half-Body Image */}
          <div className="flex-1 flex items-center justify-center overflow-hidden px-2 py-2">
            <div className="h-80 w-auto">
              <HanaAnimatedAvatar
                isSpeaking={isSpeaking}
                message={hanaMessage}
              />
            </div>
          </div>

          {/* Bottom Section: Input - Always Visible */}
          <div className="bg-white border-t border-gray-200 px-6 py-4 flex-shrink-0">
            {currentStep === 'input' && (
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type all details here..."
                  className="flex-1 px-4 py-3 border-2 border-errandify-orange border-opacity-30 rounded-full focus:outline-none focus:border-opacity-100 text-sm"
                  disabled={loading || isRecording}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={isRecording ? stopRecording : startRecording}
                  className={`px-4 py-3 rounded-full font-bold transition-all text-sm ${
                    isRecording
                      ? 'bg-red-500 hover:bg-red-600 text-white'
                      : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                  }`}
                  title={isRecording ? 'Stop recording' : 'Start voice input'}
                >
                  {isRecording ? '⏹️' : '🎤'}
                </button>
                <button
                  type="submit"
                  disabled={loading || !input.trim()}
                  className="px-6 py-3 bg-errandify-orange text-white rounded-full font-bold hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm"
                >
                  {loading ? '•••' : '→'}
                </button>
              </form>
            )}

            {currentStep === 'confirm' && (
              <div className="flex gap-3">
                <button
                  onClick={handleConfirmAndProceed}
                  disabled={loading}
                  className="flex-1 px-4 py-3 bg-green-500 text-white rounded-full font-bold hover:bg-green-600 disabled:opacity-50 text-sm"
                >
                  {loading ? 'Processing...' : '✓ Post Errand'}
                </button>
                <button
                  onClick={() => {
                    setCurrentStep('input');
                    setInput('');
                    setHanaMessage('Let me know what errand you need done!');
                  }}
                  disabled={loading}
                  className="flex-1 px-4 py-3 bg-gray-300 text-gray-700 rounded-full font-bold hover:bg-gray-400 text-sm"
                >
                  Edit
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-slideDown {
          animation: slideDown 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
