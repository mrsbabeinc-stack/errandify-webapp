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
  defaultCategory?: string | null;
}

export default function HanaTaskCreation({
  isOpen,
  onClose,
  onComplete,
  onSkipToManual,
  defaultCategory,
}: HanaTaskCreationProps) {
  const [currentStep, setCurrentStep] = useState<CollectionStep>('input');
  const [taskData, setTaskData] = useState<TaskData>({
    title: '',
    description: '',
    category: defaultCategory || '',
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
  }, [isOpen, defaultCategory]);

  const getRandomPostalCode = () => {
    const postalCodes = ['680433', '238857', '269163', '554262', '507565', '408600', '750131', '629652', '535239', '110001'];
    return postalCodes[Math.floor(Math.random() * postalCodes.length)];
  };

  const getRandomDay = () => {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    return days[Math.floor(Math.random() * days.length)];
  };

  const getRandomTime = () => {
    const times = ['9am', '10am', '12pm', '2pm', '3pm', '4pm', '5pm', '6pm', '7pm'];
    return times[Math.floor(Math.random() * times.length)];
  };

  const getRandomDuration = () => {
    const durations = ['30 mins', '1 hour', '1.5 hours', '2 hours', '2.5 hours', '3 hours', '4 hours'];
    return durations[Math.floor(Math.random() * durations.length)];
  };

  const getRandomBudget = () => {
    const budgets = [30, 50, 75, 100, 150, 200, 250, 300];
    return budgets[Math.floor(Math.random() * budgets.length)];
  };

  const getRandomCategory = () => {
    const categories = [
      'home-maintenance',
      'cleaning-household',
      'food-beverage',
      'furniture-assembly',
      'shopping-errands',
      'delivery-moving',
      'travel-mobility',
      'event-planning',
      'childcare-education',
      'eldercare-healthcare',
      'pet-care',
      'personal-care',
      'tech-support',
      'creative-arts',
      'admin-business',
      'charity-community',
    ];
    return categories[Math.floor(Math.random() * categories.length)];
  };

  const getExampleByCategory = (category: string) => {
    const postalCode = getRandomPostalCode();
    const day = getRandomDay();
    const time = getRandomTime();
    const duration = getRandomDuration();
    const budget = getRandomBudget();

    const examples: Record<string, string> = {
      'home-maintenance': `Fix my leaky kitchen tap at ${postalCode} on ${day} ${time} for ${duration}, budget $${budget}`,
      'cleaning-household': `Clean my house at ${postalCode} on ${day} ${time} for ${duration}, budget $${budget}`,
      'food-beverage': `Prepare lunch for 4 people at ${postalCode} on ${day} ${time} for ${duration}, budget $${budget}`,
      'furniture-assembly': `Assemble IKEA bookshelf at ${postalCode} on ${day} ${time} for ${duration}, budget $${budget}`,
      'shopping-errands': `Help me shopping at ${postalCode} on ${day} ${time} for ${duration}, budget $${budget}`,
      'delivery-moving': `Move my boxes from office to home (${postalCode}) on ${day} ${time} for ${duration}, budget $${budget}`,
      'travel-mobility': `Drive me to Changi Airport from home (${postalCode}) on ${day} ${time}, budget $${budget}`,
      'event-planning': `Help decorate apartment for party at ${postalCode} on ${day} ${time} for ${duration}, budget $${budget}`,
      'childcare-education': `Tutor my son in Math at ${postalCode} on ${day} ${time} for ${duration}, budget $${budget}`,
      'eldercare-healthcare': `Help mum with groceries and checkup at ${postalCode} on ${day} ${time} for ${duration}, budget $${budget}`,
      'pet-care': `Dog walk my golden retriever at ${postalCode} on ${day} ${time} for ${duration}, budget $${budget}`,
      'personal-care': `Hair cut at home (${postalCode}) on ${day} ${time} for ${duration}, budget $${budget}`,
      'tech-support': `Fix my WiFi router at ${postalCode} on ${day} ${time} for ${duration}, budget $${budget}`,
      'creative-arts': `Design a logo for my business, deadline ${day} ${time}, budget $${budget}`,
      'admin-business': `Help with data entry for my business, ${duration} total, budget $${budget}`,
      'charity-community': `Help pack donation boxes at center (${postalCode}) on ${day} ${time} for ${duration}, budget $${budget}`,
    };
    return examples[category] || `Describe your errand: what (required), postal code (required), date & time (required), duration (required), budget SGD (required)`;
  };

  const initializeChat = () => {
    // Use provided category or pick a random one for inspiration
    const categoryToUse = defaultCategory || getRandomCategory();
    const example = getExampleByCategory(categoryToUse);
    setHanaMessage(`Hi! What errand do you need help with?\n\nExample:\n'${example}'`);
    setCurrentStep('input');
    triggerSpeaking();
  };

  const triggerSpeaking = () => {
    // Voice disabled - removed
    setIsSpeaking(false);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) {
      console.log('[Hana] Skipping - input empty or already loading');
      return;
    }

    const userInput = input.trim();
    console.log('[Hana] Processing input:', userInput);
    setInput('');
    setLoading(true);
    console.log('[Hana] Set loading to true');

    try {
      // Send user input to AI to extract all info at once
      await extractTaskInfo(userInput);
    } catch (error) {
      console.error('Chat error:', error);
      setHanaMessage('Sorry, I had trouble understanding. Can you try again?');
      setCurrentStep('input'); // Make sure we return to input step
    } finally {
      console.log('[Hana] Setting loading to false after processing');
      setLoading(false);
    }
  };

  const extractTaskInfo = async (userInput: string) => {
    try {
      // Check raw input for explicit inappropriate requests like "provide sex", "sell drugs"
      // Only check for SERIOUS violations (sex, drugs, violence, illegal)
      const seriousKeywords = ['sex', 'porn', 'drug', 'cocaine', 'heroin', 'marijuana', 'bomb', 'weapon', 'gun', 'steal', 'rob', 'hacking'];
      const lowerInput = userInput.toLowerCase();

      for (const keyword of seriousKeywords) {
        if (lowerInput.includes(keyword)) {
          console.log('[Hana] Serious violation detected:', keyword);
          setHanaMessage('I cannot help with that request. It contains inappropriate content. Please describe your errand in a different way. 😊');
          setCurrentStep('input');
          setInput('');
          setLoading(false);
          return;
        }
      }

      // Use AI to extract structured task info from freeform input
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/ai/extract-task-info`,
        { input: userInput }
      );

      console.log('Extract response:', response.data);
      const extracted = response.data.data;
      console.log('[Hana] Extracted budget:', extracted.budget, 'type:', typeof extracted.budget);
      console.log('[Hana] Extracted title:', extracted.title);

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

      // Check if critical fields are missing - if so, go to form directly
      // Critical fields: title, category, date, time, budget
      const hasMissingCritical =
        !updatedTaskData.title ||
        !updatedTaskData.category ||
        !updatedTaskData.date ||
        !updatedTaskData.time ||
        !updatedTaskData.budget;

      if (hasMissingCritical) {
        console.log('[Hana] Missing critical fields, going to form for user to complete');
        setHanaMessage('✅ Got what I could! Let me take you to the form to fill in the details. 📝');
        triggerSpeaking();

        setTimeout(() => {
          onComplete(updatedTaskData as any);
        }, 1000);
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

        // Check content moderation on EXTRACTED data only (not raw input)
        try {
          const contentCheckResponse = await axios.post(
            `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/ai/check-content`,
            {
              title: enhancedTaskData.title,
              description: enhancedTaskData.description || '',
              notes: enhancedTaskData.notes || '',
            }
          );

          if (!contentCheckResponse.data.data.is_safe) {
            console.log('[Hana] Content check failed on extracted data');
            setHanaMessage('I cannot help with that request. It contains inappropriate content. Please describe your errand in a different way. 😊');
            setCurrentStep('input');
            setInput('');
            return;
          }
        } catch (contentCheckErr) {
          console.warn('[Hana] Content check error:', contentCheckErr);
          // Continue anyway if content check fails
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

        {/* Main Content - Simple: Bubble Top, Hana Center, Input Bottom */}
        <div className="flex-1 overflow-y-auto flex flex-col px-6 py-6 gap-6">
          {/* Speech Bubble - Top (Full Width) */}
          {hanaMessage && (
            <div className="flex-shrink-0">
              <div className="relative animate-slideDown mx-auto max-w-lg"
                   style={{
                     background: 'linear-gradient(135deg, #FFF8F0 0%, #FFE8D6 100%)',
                     border: '1.5px solid #FF8C42',
                     borderRadius: '18px',
                     padding: '14px 18px',
                     boxShadow: '0 4px 12px rgba(255, 140, 66, 0.12), 0 1px 3px rgba(0,0,0,0.06)',
                   }}>
                <p className="whitespace-pre-line text-xs font-medium text-center"
                   style={{color: '#5C4033', fontFamily: "'Inter', 'Segoe UI', sans-serif", lineHeight: '1.5', letterSpacing: '0px'}}>
                  {hanaMessage}
                </p>
                {/* Speech bubble tail - pointing down */}
                <div style={{
                  position: 'absolute',
                  bottom: '-8px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: '0',
                  height: '0',
                  borderLeft: '7px solid transparent',
                  borderRight: '7px solid transparent',
                  borderTop: '8px solid #FF8C42',
                }} />
                <div style={{
                  position: 'absolute',
                  bottom: '-6px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: '0',
                  height: '0',
                  borderLeft: '5px solid transparent',
                  borderRight: '5px solid transparent',
                  borderTop: '6px solid #FFF8F0',
                }} />
              </div>
            </div>
          )}

          {/* Middle Space - Hana Centered */}
          <div className="flex-1 flex items-center justify-center">
            <div style={{ height: '300px', width: 'auto', maxWidth: '220px' }}>
              <HanaAnimatedAvatar
                isSpeaking={isSpeaking}
                message={hanaMessage}
              />
            </div>
          </div>

          {/* Input Section - Bottom (Full Width) */}
          {currentStep === 'input' && (
            <form onSubmit={handleSendMessage} className="flex gap-3 flex-shrink-0">
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
                className={`px-4 py-3 rounded-full font-bold transition-all text-sm flex-shrink-0 ${
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
                className="px-6 py-3 bg-errandify-orange text-white rounded-full font-bold hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm flex-shrink-0"
              >
                {loading ? '•••' : '→'}
              </button>
            </form>
          )}

          {currentStep === 'confirm' && (
            <div className="flex gap-3 flex-shrink-0">
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
