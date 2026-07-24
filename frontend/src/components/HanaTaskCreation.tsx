import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import HanaAnimatedAvatar from './HanaAnimatedAvatar';
import { loadResponsiveVoice } from '../utils/responsiveVoice';

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
  isRecurring?: boolean;
  repeatEvery?: number;
  repeatUnit?: 'day' | 'week' | 'month';
  occurrences?: number;
  suggestedCertifications?: string[];
  suggestedDescription?: string;
  suggestedNotes?: string;
}

type CollectionStep = 'input' | 'confirm' | 'complete';

interface HanaTaskCreationProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (taskData: TaskData) => void;
  onSkipToManual: () => void;
  defaultCategory?: string | null;
}

export default function HanaTaskCreation({
  isOpen,
  onClose,
  onComplete,
  onSkipToManual,
  defaultCategory,
}: HanaTaskCreationProps) {
  /**
   * Is the phone keyboard up?
   *
   * The screen is a fixed, full-height panel. When the keyboard opens, the
   * layout viewport does NOT shrink — only the visual viewport does — so the
   * panel stayed its full height and everything below the fold went behind the
   * keys: the example bubble, and the input the user was typing into.
   *
   * visualViewport reports the actually-visible area. When it loses more than
   * 160px to the keyboard, Hana's portrait is stood down so the bubble and the
   * input keep the room. She is the decoration on this screen; the box you
   * type in is the screen.
   */
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const onResize = () => setKeyboardOpen(window.innerHeight - vv.height > 160);
    onResize();
    vv.addEventListener('resize', onResize);
    return () => vv.removeEventListener('resize', onResize);
  }, []);

  const [currentStep, setCurrentStep] = useState<CollectionStep>('input');
  const [taskData, setTaskData] = useState<TaskData>({
    title: '',
    description: '',
    category: defaultCategory || '',
    location: '',
    area: '',
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
  const recognitionRef = useRef<any>(null);
  const speakAudioRef = useRef<HTMLAudioElement | null>(null);
  const speakSeqRef = useRef(0);

  // Read a line out loud via the backend TTS endpoint (one voice at a time, softer volume)
  const speakText = async (text: string) => {
    const mySeq = ++speakSeqRef.current;
    // Stop anything already playing (prevents overlapping = echo)
    if (speakAudioRef.current) {
      speakAudioRef.current.pause();
      speakAudioRef.current.currentTime = 0;
      speakAudioRef.current = null;
    }
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/chat/hana/speak`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, language: 'en' }),
      });
      const data = await res.json();
      const src = data?.data?.audio;
      // A newer speak request superseded this one — don't play (avoids double voice)
      if (!src || mySeq !== speakSeqRef.current) return;
      const audio = new Audio(src);
      audio.volume = 0.55;
      speakAudioRef.current = audio;
      setIsSpeaking(true);
      audio.onended = () => setIsSpeaking(false);
      audio.onerror = () => setIsSpeaking(false);
      await audio.play().catch(() => setIsSpeaking(false));
    } catch {
      setIsSpeaking(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      // Lazy-load ResponsiveVoice only when Hana opens
      loadResponsiveVoice().then(() => {
        if (!hanaMessage) {
          initializeChat();
        }
      });
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

  const getRandomDate = () => {
    const dates = ['tomorrow', 'next Wednesday', 'this Saturday', 'next Monday', 'in 3 days'];
    return dates[Math.floor(Math.random() * dates.length)];
  };

  const getExampleByCategory = (category: string) => {
    const postalCode = getRandomPostalCode();
    const date = getRandomDate();
    const time = getRandomTime();
    const duration = getRandomDuration();
    const budget = getRandomBudget();

    const examples: Record<string, string> = {
      'home-maintenance': `Fix leaky kitchen tap, ${postalCode}, ${date}, ${time}, ${duration}, $${budget}`,
      'cleaning-household': `Clean my house, ${postalCode}, ${date}, ${time}, ${duration}, $${budget}`,
      'food-beverage': `Prepare lunch for 4 people, ${postalCode}, ${date}, ${time}, ${duration}, $${budget}`,
      'furniture-assembly': `Assemble IKEA bookshelf, ${postalCode}, ${date}, ${time}, ${duration}, $${budget}`,
      'shopping-errands': `Grocery shopping, ${postalCode}, ${date}, ${time}, ${duration}, $${budget}`,
      'delivery-moving': `Move boxes from office to home, ${postalCode}, ${date}, ${time}, ${duration}, $${budget}`,
      'travel-mobility': `Drive me to airport, ${postalCode}, ${date}, ${time}, ${duration}, $${budget}`,
      'event-planning': `Decorate apartment for party, ${postalCode}, ${date}, ${time}, ${duration}, $${budget}`,
      'childcare-education': `Tutor my son in Math, ${postalCode}, ${date}, ${time}, ${duration}, $${budget}`,
      'eldercare-healthcare': `Help mum with groceries, ${postalCode}, ${date}, ${time}, ${duration}, $${budget}`,
      'pet-care': `Walk my dog, ${postalCode}, ${date}, ${time}, ${duration}, $${budget}`,
      'personal-care': `Hair cut at home, ${postalCode}, ${date}, ${time}, ${duration}, $${budget}`,
      'tech-support': `Fix WiFi router, ${postalCode}, ${date}, ${time}, ${duration}, $${budget}`,
      'creative-arts': `Design logo for my business, ${postalCode}, ${date}, ${time}, ${duration}, $${budget}`,
      'admin-business': `Data entry for my business, ${postalCode}, ${date}, ${time}, ${duration}, $${budget}`,
      'charity-community': `Pack donation boxes, ${postalCode}, ${date}, ${time}, ${duration}, $${budget}`,
    };
    return examples[category] || `[errand], [postal code], [date], [time], [duration], $[amount]`;
  };

  const initializeChat = () => {
    const categoryToUse = defaultCategory || getRandomCategory();
    const example = getExampleByCategory(categoryToUse);
    setHanaMessage(`Hi! What errand do you need help with?\n\nExample:\n'${example}'`);
    setCurrentStep('input');
    speakText('Hi! What errand do you need help with?');
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
      console.log('[Hana] Extracted fullAddress:', extracted.fullAddress);
      console.log('[Hana] Extracted postalCode:', extracted.postalCode);
      console.log('[Hana] Extracted location:', extracted.location);

      // Update task data with extracted info
      const updatedTaskData: TaskData = {
        title: extracted.title || userInput.substring(0, 50),
        description: extracted.description || '',
        category: extracted.category || '',
        location: extracted.location || '',
        area: extracted.area || '',
        fullAddress: extracted.fullAddress || extracted.location || '',
        date: extracted.date || new Date().toISOString().split('T')[0],
        time: extracted.time || '10:00',
        duration: extracted.duration || '',
        durationUnit: extracted.durationUnit || 'Hr',
        budget: extracted.budget ? String(extracted.budget) : '',
        postalCode: extracted.postalCode || '',
        notes: extracted.notes || '',
        isRecurring: extracted.isRecurring || false,
        repeatEvery: extracted.repeatEvery || 1,
        repeatUnit: extracted.repeatUnit || 'week',
        occurrences: extracted.occurrences || 1,
      };

      console.log('[Hana] Updated errand data:', updatedTaskData);

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

      // Keep AI-generated tips and skills from extraction
      // Description field stays EMPTY - tips show as suggestion below form field
      const enhancedTaskData = {
        ...updatedTaskData,
        description: '', // Keep empty for user to fill manually
        suggestedDescription: extracted.description || '', // AI tips based on title (e.g., "Pet care service. Specify pet type, breed...")
        suggestedCertifications: extracted.suggestedSkills || [], // Suggested skills/certifications
        notes: extracted.notes || '',
      };

      console.log('[Hana] AI extraction complete with tips:', extracted.description);
      console.log('[Hana] Suggested skills:', extracted.suggestedSkills);

      // Validate date and time ONLY if user provided them
      if (enhancedTaskData.date && enhancedTaskData.date !== 'TBD' && enhancedTaskData.time && enhancedTaskData.time !== 'TBD') {
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

      // Auto-proceed directly to form with pre-filled data
      setHanaMessage('✅ Got it! Opening form with your details...');
      triggerSpeaking();

      // Auto-fill form and proceed after a short delay
      setTimeout(() => {
        console.log('[Hana] Calling onComplete with:', enhancedTaskData);
        onComplete(enhancedTaskData as any);
      }, 1000);
    } catch (err: any) {
      console.error('Extraction error:', err);
      const errorMsg = err.response?.data?.error || err.message || 'Unknown error';
      console.log('Full error:', errorMsg);
      setHanaMessage(`Sorry, I had trouble understanding that. Error: ${errorMsg}\n\nPlease try again with: what you need, where, when, and budget.`);
    }
  };

  const buildSummary = (data: TaskData) => {
    let summary = '✓ Errand Summary:\n\n';
    if (data.title) summary += `📝 ${data.title}\n`;
    if (data.fullAddress) summary += `📍 ${data.fullAddress}\n`;
    else if (data.location) summary += `📍 ${data.location}\n`;
    if (data.postalCode) summary += `🏘️ ${data.postalCode}\n`;
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
        setHanaMessage('⚠️ This errand needs review. Our team will check it shortly.');
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

  // Voice input via the browser's on-device speech recognition. The old flow
  // recorded audio and POSTed it to /api/ai/transcribe, but that endpoint was
  // never implemented (404), so voice-to-form never worked. Web Speech API
  // transcribes locally — nothing to build server-side, and the user's voice
  // never leaves the device (the PDPA-preferable choice for voice data).
  const startRecording = () => {
    const SR: any = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      alert("Voice input isn't supported in this browser. Please type your errand instead.");
      return;
    }
    try {
      const recognition = new SR();
      recognition.lang = 'en-SG';
      recognition.interimResults = true;
      recognition.continuous = false;
      recognition.maxAlternatives = 1;
      recognitionRef.current = recognition;

      let finalText = '';
      recognition.onresult = (event: any) => {
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const t = event.results[i][0].transcript;
          if (event.results[i].isFinal) finalText += t;
          else interim += t;
        }
        // Live-update the box as they speak.
        setInput((finalText + interim).trim());
      };
      recognition.onerror = (e: any) => {
        console.error('Speech recognition error:', e?.error);
        setIsRecording(false);
        if (e?.error === 'not-allowed' || e?.error === 'service-not-allowed') {
          alert('Please allow microphone access to use voice input.');
        }
      };
      recognition.onend = () => {
        setIsRecording(false);
        const text = finalText.trim();
        if (text) {
          setInput(text);
          // Give React a beat to commit the value, then submit — same as before.
          setTimeout(() => handleSendMessage({ preventDefault: () => {} } as any), 300);
        }
      };

      recognition.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Could not start voice input:', err);
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    try { recognitionRef.current?.stop(); } catch { /* already stopped */ }
    setIsRecording(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-white z-40 flex items-stretch justify-center p-0">
      {/* Full-screen sheet — covers the app header behind so nothing peeks through */}
      <div className="bg-white shadow-2xl w-full h-[100dvh] max-w-2xl flex flex-col overflow-hidden">
        {/* No top header — just floating Manual + Close controls, nudged down from the top edge */}
        <div className="flex items-center justify-end gap-2 px-5 pt-6 pb-1 flex-shrink-0">
          <button
            type="button"
            onClick={onSkipToManual}
            className="px-3 py-1.5 bg-white text-errandify-orange border border-orange-200 rounded-full font-bold hover:bg-orange-50 text-xs shadow-sm flex-shrink-0"
            title="Skip Hana and enter details manually"
          >
            ✎ Manual
          </button>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white border border-gray-200 text-gray-500 hover:text-gray-700 hover:bg-gray-50 text-lg font-light flex items-center justify-center shadow-sm flex-shrink-0"
            title="Close"
          >
            ✕
          </button>
        </div>

        {/* Main Content - Bubble Renders First (Loads First), Hana Below (Visual Order) */}
        <div className="flex-1 overflow-y-auto flex flex-col px-6 py-4 gap-3" style={{ display: 'flex', flexDirection: 'column-reverse' }}>
          {/* Hana Full Body - Renders Last but Appears First (Slightly Smaller, Fills Space) */}
          <div
            className={`flex items-end justify-center min-h-0 transition-all duration-200 ${
              keyboardOpen ? 'hidden' : 'flex-1'
            }`}
          >
            <div style={{ height: '100%', width: 'auto', maxWidth: '260px' }}>
              <HanaAnimatedAvatar
                isSpeaking={isSpeaking}
                message={hanaMessage}
              />
            </div>
          </div>

          {/* Speech Bubble - Renders First but Appears Second (Centered, Happy 3D Design) */}
          {hanaMessage && (
            <div className="flex-shrink-0 pb-2">
              <div className="relative animate-slideDown mx-auto max-w-md overflow-hidden"
                   style={{
                     background: 'linear-gradient(160deg, #FFFFFF 0%, #FFF3E9 55%, #FFE7D3 100%)',
                     border: '1px solid rgba(255,140,66,0.28)',
                     borderRadius: '26px',
                     boxShadow: '0 18px 40px rgba(255,107,53,0.22), 0 6px 14px rgba(0,0,0,0.08)',
                   }}>
                {/* Hana header row (ties the card to the theme) */}
                <div className="flex items-center gap-2.5 px-5 pt-4 pb-3" style={{ borderBottom: '1px solid rgba(255,140,66,0.15)' }}>
                  <img src="/images/hana-avatar.png" alt="Hana" className="w-8 h-8 rounded-full object-cover border-2 border-white shadow-sm flex-shrink-0" />
                  <span className="text-sm font-extrabold" style={{ color: '#FF6B35' }}>Hana</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(255,140,66,0.14)', color: '#C4551F' }}>AI Sister</span>
                  <button
                    type="button"
                    onClick={() => speakText('Hi! What errand do you need help with?')}
                    className={`ml-auto text-base w-8 h-8 rounded-full flex items-center justify-center hover:scale-110 transition-transform ${isSpeaking ? 'bg-orange-200' : 'bg-white/70'}`}
                    title="Hear it again"
                  >
                    {isSpeaking ? '🔊' : '🔈'}
                  </button>
                </div>
                {/* Message body */}
                <div className="px-5 py-4">
                  {(() => {
                    const [greeting, ...rest] = hanaMessage.split(/\n\nExample:\n/);
                    const example = (rest[0] || '').replace(/^'/, '').replace(/'$/, '');
                    return (
                      <>
                        <p className="text-lg font-extrabold text-center leading-snug"
                           style={{ color: '#3A2A1E', fontFamily: "'Inter','Segoe UI',sans-serif", letterSpacing: '-0.3px' }}>
                          {greeting}
                        </p>
                        {example && (
                          <div className="mt-3 rounded-2xl px-4 py-3 text-center bg-white/70" style={{ border: '1px dashed rgba(255,140,66,0.45)' }}>
                            <p className="text-xs font-semibold mb-1" style={{ color: '#FF8C42' }}>💡 For example</p>
                            <p className="text-sm font-semibold leading-snug" style={{ color: '#6B4A35' }}>{example}</p>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
                {/* Speech bubble tail - 3D pointing down */}
                {/* Outer tail (shadow for depth) */}
                <div style={{
                  position: 'absolute',
                  bottom: '-10px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: '0',
                  height: '0',
                  borderLeft: '8px solid transparent',
                  borderRight: '8px solid transparent',
                  borderTop: '10px solid rgba(255, 140, 66, 0.25)',
                  filter: 'drop-shadow(0 2px 3px rgba(0, 0, 0, 0.1))',
                }} />
                {/* Inner tail (matches card bottom) */}
                <div style={{
                  position: 'absolute',
                  bottom: '-8px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: '0',
                  height: '0',
                  borderLeft: '7px solid transparent',
                  borderRight: '7px solid transparent',
                  borderTop: '8px solid #FFE7D3',
                }} />
              </div>
            </div>
          )}
        </div>

        {/* Input Section - big text box with mic + send buttons inside it */}
        {currentStep === 'input' && (
          <div className="flex-shrink-0 pb-4 px-6 w-full">
            <div className="relative border-2 border-errandify-orange border-opacity-40 rounded-2xl bg-white focus-within:border-opacity-100 transition-colors">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  // Submit on Enter (unless Shift is pressed for new line)
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage({ preventDefault: () => {} } as any);
                  }
                }}
                placeholder="Type all details here..."
                className="w-full px-4 pt-3 pb-14 bg-transparent rounded-2xl focus:outline-none text-base font-semibold resize-none"
                rows={2}
                disabled={loading || isRecording}
                autoFocus
              />
              {/* Mic + Send buttons INSIDE the box (bottom-right) */}
              <div className="absolute bottom-3 right-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={isRecording ? stopRecording : startRecording}
                  className={`w-11 h-11 rounded-full font-bold transition-all text-lg flex items-center justify-center flex-shrink-0 ${
                    isRecording
                      ? 'bg-red-500 hover:bg-red-600 text-white'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  }`}
                  title={isRecording ? 'Stop recording' : 'Start voice input'}
                >
                  {isRecording ? '⏹️' : '🎤'}
                </button>
                <button
                  type="button"
                  onClick={handleSendMessage}
                  disabled={loading || !input.trim()}
                  className="w-11 h-11 rounded-full bg-errandify-orange text-white text-xl font-bold hover:bg-opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center flex-shrink-0 shadow-md"
                  title="Send"
                >
                  {loading ? '•••' : '→'}
                </button>
              </div>
            </div>
          </div>
        )}

        {currentStep === 'confirm' && (
          <div className="flex gap-3 flex-shrink-0 pb-2 px-6">
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
