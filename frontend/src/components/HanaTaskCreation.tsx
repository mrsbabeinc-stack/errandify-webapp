import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import HanaAnimatedAvatar from './HanaAnimatedAvatar';

interface TaskData {
  title: string;
  description: string;
  category: string;
  location: string;
  date: string;
  time: string;
  budget: string;
  notes: string;
}

type CollectionStep = 'title' | 'location' | 'date' | 'budget' | 'confirm' | 'complete';

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
  const [currentStep, setCurrentStep] = useState<CollectionStep>('title');
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
    setHanaMessage("Hello! I'm Hana. Let's create your task together!\n\nShare what you need done, your location, timing, and budget. I'll help you fill in some details.");
    setCurrentStep('title');
    triggerSpeaking();
  };

  const triggerSpeaking = () => {
    setIsSpeaking(true);
    setTimeout(() => setIsSpeaking(false), 4000);
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

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userInput = input.trim();
    setInput('');
    setLoading(true);

    try {
      await processUserInput(userInput);
    } catch (error) {
      console.error('Chat error:', error);
      setHanaMessage('Sorry, I had trouble understanding. Can you try again?');
    } finally {
      setLoading(false);
    }
  };

  const processUserInput = async (userInput: string) => {
    switch (currentStep) {
      case 'title':
        await handleTitle(userInput);
        break;
      case 'location':
        await handleLocation(userInput);
        break;
      case 'date':
        await handleDate(userInput);
        break;
      case 'budget':
        await handleBudget(userInput);
        break;
    }
  };

  const handleTitle = async (input: string) => {
    setTaskData((prev) => ({ ...prev, title: input, description: input }));

    // Detect category
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/ai/detect-category`,
        { title: input, description: input }
      );
      if (response.data.data.category) {
        setTaskData((prev) => ({ ...prev, category: response.data.data.category }));
      }
    } catch (err) {
      console.log('Category detection failed');
    }

    setHanaMessage("Great! 📍 Now, where do you need this done?");
    setCurrentStep('location');
    triggerSpeaking();
  };

  const handleLocation = async (input: string) => {
    setTaskData((prev) => ({ ...prev, location: input }));
    setHanaMessage("Perfect! 📅 When do you need it done?\n(e.g., Tomorrow, Saturday, 25 Dec at 2pm)");
    setCurrentStep('date');
    triggerSpeaking();
  };

  const handleDate = async (input: string) => {
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/ai/parse-datetime`,
        { input }
      );
      setTaskData((prev) => ({
        ...prev,
        date: response.data.data.date,
        time: response.data.data.time,
      }));
    } catch (err) {
      setTaskData((prev) => ({ ...prev, date: input, time: '10:00' }));
    }

    setHanaMessage("Excellent! 💰 What's your budget? (in SGD)");
    setCurrentStep('budget');
    triggerSpeaking();
  };

  const handleBudget = async (input: string) => {
    const budget = input.replace(/[^\d.]/g, '');
    setTaskData((prev) => ({ ...prev, budget }));

    const summary = `Perfect! Here's your task summary:\n\n✓ ${taskData.title}\n📍 ${taskData.location}\n📅 ${new Date(taskData.date).toLocaleDateString('en-SG')} ${taskData.time}\n💰 SGD $${budget}`;

    setHanaMessage(summary + "\n\nReady to post and get suggestions?");
    setCurrentStep('confirm');
    triggerSpeaking();
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

      setHanaMessage('✅ Perfect! Let me fill in the details for you...');
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
            <div className="px-6 pt-4 flex-shrink-0">
              <div className="bg-errandify-bg border-2 border-errandify-orange rounded-3xl px-6 py-4 shadow-md animate-slideDown">
                <p className="text-gray-800 text-center whitespace-pre-line leading-relaxed text-sm">
                  {hanaMessage}
                </p>
              </div>
            </div>
          )}

          {/* Middle Section: Hana Half-Body Image with Animation */}
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
            {currentStep !== 'confirm' && currentStep !== 'complete' && (
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type here..."
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
                  {loading ? 'Processing...' : '✓ Post Task'}
                </button>
                <button
                  onClick={() => {
                    setCurrentStep('budget');
                    setHanaMessage("What's your budget? (in SGD)");
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
