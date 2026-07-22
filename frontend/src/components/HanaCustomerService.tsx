import { useState, useRef, useEffect } from 'react';
import axios from 'axios';

// Floating animation
const floatingStyle = `
  @keyframes float {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-8px); }
  }
  .floating-button {
    animation: float 3s ease-in-out infinite;
  }
`;

// Inject styles once
if (typeof document !== 'undefined' && !document.getElementById('floating-animation')) {
  const style = document.createElement('style');
  style.id = 'floating-animation';
  style.textContent = floatingStyle;
  document.head.appendChild(style);
}

interface Message {
  id: string;
  sender: 'user' | 'hana';
  text: string;
  timestamp: Date;
  suggestedCategory?: string;
  actions?: Array<{ label: string; action: string }>;
}

type Language = 'en' | 'zh';

const LANGUAGE_NAMES: Record<Language, string> = {
  en: '🇬🇧 English',
  zh: '🇨🇳 中文',
};

const LANGUAGE_PROMPTS: Record<Language, string> = {
  en: 'Reply in English.',
  zh: '用中文回复。',
};

// Quick reply suggestions (context-aware) with navigation
const QUICK_REPLIES: Record<Language, Array<{ label: string; action: string }>> = {
  en: [
    { label: 'Create new errand', action: '/create-errand-hana' },
    { label: 'My errands', action: '/errands' },
    { label: 'My wallet', action: '/wallet' },
    { label: 'Referral', action: '/referral' },
  ],
  zh: [
    { label: '创建新任务', action: '/create-errand-hana' },
    { label: '我的任务', action: '/errands' },
    { label: '我的钱包', action: '/wallet' },
    { label: '推荐', action: '/referral' },
  ],
};

// Context memory limit (keep last N messages for context)
const CONTEXT_MEMORY_LIMIT = 5;

// Intent detection for common questions - provide instant answers
const INTENT_RESPONSES: Record<Language, Record<string, string>> = {
  en: {
    'post_errand': 'To post an errand:\n1. Tap the + button at the bottom\n2. Describe what you need\n3. Set your budget and deadline\n4. Submit\n\nThat\'s it! You\'ll see offers from doers.',
    'browse_errands': 'To find errands:\n1. Tap the magnifying glass icon (Browse)\n2. Browse available errands by category\n3. Tap one to see details\n4. Tap Accept to place your offer',
    'payment': 'Your payment is secure with us until the work is done and confirmed. You get paid once the errand poster approves your work.',
    'bidding': 'You can place a offer on any errand by tapping Accept. The person who posted will choose their favourite doer. You can offer any amount you think is fair.',
  },
  zh: {
    'post_errand': '发布帮帮很简单：\n1. 点击底部的 + 按钮\n2. 描述你需要的帮助\n3. 设定预算和截止日期\n4. 提交\n\n就这样！你会收到帮手的出价。',
    'browse_errands': '查找帮帮：\n1. 点击放大镜图标（浏览）\n2. 按类别浏览可用的帮帮\n3. 点击查看详情\n4. 点击接受来出价',
    'payment': '您的款项在工作完成并确认前由我们安全保管。一旦发布者批准您的工作，您就能获得报酬。',
    'bidding': '您可以通过点击接受来对任何帮帮出价。发布者会选择他们最喜欢的帮手。您可以出价任何您认为公平的金额。',
  },
};

// Detect user intent from message
const detectIntent = (message: string): string | null => {
  const lower = message.toLowerCase();

  // Post/create intent
  if (/post|create|publish|submit|how.*post|how.*create|how.*submit/.test(lower)) {
    return 'post_errand';
  }

  // Browse intent
  if (/browse|find|search|look for|how.*find|how.*search/.test(lower)) {
    return 'browse_errands';
  }

  // Payment intent
  if (/payment|money|price|pay|cost|how.*payment|how.*much/.test(lower)) {
    return 'payment';
  }

  // Bidding intent
  if (/bid|accept|offer|how.*bid|how.*accept|how.*offer/.test(lower)) {
    return 'bidding';
  }

  return null;
};

const getGreeting = (lang: Language) => {
  if (lang === 'zh') {
    return '你好！很高兴为你服务～ 我是帮帮乐的助手，随时准备帮你处理各种生活小任务。';
  }
  return "Hi there! I'm Hana, your Errandify assistant. How can I help you today?";
};

interface UserData {
  id?: string;
  name?: string;
  display_name?: string;
  alias?: string;
  email?: string;
  phone?: string;
  role?: string;
}

interface ErrandData {
  id: number;
  title: string;
  description?: string;
  status: string;
  category: string;
  budget: number;
  deadline?: string;
  createdAt?: string;
  role?: 'asker' | 'doer'; // Track which role user has in this errand
}

export default function HanaCustomerService() {
  console.log('[Hana] Component mounted');
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [language, setLanguage] = useState<Language>('en');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      sender: 'hana',
      text: getGreeting('en'),
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const [showQuickReplies, setShowQuickReplies] = useState(true);

  // User and Errand Data
  const [userData, setUserData] = useState<UserData | null>(null);
  const [errands, setErrands] = useState<ErrandData[]>([]);
  const [wallet, setWallet] = useState<number>(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesisUtterance | null>(null);
  const lastUserMessageRef = useRef<string>('');
  const lastSpokenTextRef = useRef<string>('');

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Quick reply handler - navigate directly (Option A)
  const handleQuickReply = (action: string) => {
    setShowQuickReplies(false);
    // Direct navigation - no chat message
    window.location.href = action;
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load user data from localStorage and errands from API
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const userStr = localStorage.getItem('user');
        if (userStr) {
          const user = JSON.parse(userStr);
          setUserData(user);
          console.log('[Hana] User data loaded:', user.display_name || user.name);
        }

        // Load wallet balance
        const walletStr = localStorage.getItem('wallet_balance');
        if (walletStr) {
          setWallet(parseFloat(walletStr));
        }

        // Load errands from API (both asker and doer)
        const token = localStorage.getItem('token');
        if (token) {
          const allErrands: ErrandData[] = [];

          try {
            // Fetch errands where user is ASKER
            const askerResponse = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/errands`, {
              headers: { 'Authorization': `Bearer ${token}` },
            });
            console.log('[Hana] Asker API response status:', askerResponse.status);
            if (askerResponse.ok) {
              const askerData = await askerResponse.json();
              console.log('[Hana] Asker API response:', askerData);
              if (askerData.data && Array.isArray(askerData.data)) {
                const askerErrands = askerData.data.map((e: any) => ({
                  ...e,
                  role: 'asker' as const,
                }));
                allErrands.push(...askerErrands);
                console.log('[Hana] Loaded asker errands:', askerErrands.length);
              } else if (Array.isArray(askerData)) {
                // If response is directly an array
                const askerErrands = askerData.map((e: any) => ({
                  ...e,
                  role: 'asker' as const,
                }));
                allErrands.push(...askerErrands);
                console.log('[Hana] Loaded asker errands (direct array):', askerErrands.length);
              }
            } else {
              console.warn('[Hana] Asker API response not ok:', askerResponse.statusText);
            }
          } catch (err) {
            console.warn('[Hana] Failed to fetch asker errands:', err);
          }

          try {
            // Fetch errands where user is DOER (my-bids)
            const doerResponse = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/bids/my-bids`, {
              headers: { 'Authorization': `Bearer ${token}` },
            });
            console.log('[Hana] Doer API response status:', doerResponse.status);
            if (doerResponse.ok) {
              const doerData = await doerResponse.json();
              console.log('[Hana] Doer API response:', doerData);
              if (doerData.data && Array.isArray(doerData.data)) {
                const doerErrands = doerData.data.map((bid: any) => ({
                  id: bid.errand_id,
                  title: bid.errand?.title || 'Unknown',
                  description: bid.errand?.description,
                  status: bid.errand?.status || bid.status, // Use errand status, fallback to bid status
                  category: bid.errand?.category,
                  budget: bid.errand?.budget || bid.amount,
                  deadline: bid.errand?.deadline,
                  role: 'doer' as const,
                }));
                allErrands.push(...doerErrands);
                console.log('[Hana] Loaded doer errands (offers):', doerErrands.length);
              } else if (Array.isArray(doerData)) {
                // If response is directly an array
                const doerErrands = doerData.map((bid: any) => ({
                  id: bid.errand_id,
                  title: bid.errand?.title || 'Unknown',
                  description: bid.errand?.description,
                  status: bid.errand?.status || bid.status,
                  category: bid.errand?.category,
                  budget: bid.errand?.budget || bid.amount,
                  deadline: bid.errand?.deadline,
                  role: 'doer' as const,
                }));
                allErrands.push(...doerErrands);
                console.log('[Hana] Loaded doer errands (direct array):', doerErrands.length);
              }
            } else {
              console.warn('[Hana] Doer API response not ok:', doerResponse.statusText);
            }
          } catch (err) {
            console.warn('[Hana] Failed to fetch doer errands:', err);
          }

          setErrands(allErrands);
          console.log('[Hana] Total errands loaded:', allErrands.length);
          console.log('[Hana] All errands with roles:', allErrands.map(e => ({ id: e.id, title: e.title, role: e.role, status: e.status })));
        }
      } catch (error) {
        console.error('[Hana] Error loading user data:', error);
      }
    };

    loadUserData();
  }, []);

  // Update greeting when Hana is opened with user name
  useEffect(() => {
    if (isOpen && userData && messages.length === 1) {
      const activeAskerErrands = errands.filter(e => e.role === 'asker' && e.status !== 'completed' && e.status !== 'cancelled').length;
      const activeDoerErrands = errands.filter(e => e.role === 'doer' && e.status !== 'completed' && e.status !== 'cancelled').length;
      const totalActive = activeAskerErrands + activeDoerErrands;

      const newGreeting = language === 'zh'
        ? `你好 ${userData.display_name || userData.name}！很高兴为你服务。你有 ${activeAskerErrands} 个作为发布者的活跃任务，${activeDoerErrands} 个作为执行者的活跃任务。有什么我可以帮助你的吗？`
        : `Hi ${userData.display_name || userData.name}! You have ${activeAskerErrands} active errand(s) as an Asker and ${activeDoerErrands} as a Doer. How can I help you today?`;

      const updatedMessages = [{
        id: '1',
        sender: 'hana' as const,
        text: newGreeting,
        timestamp: new Date(),
      }];
      setMessages(updatedMessages);

      // Auto-speak greeting if enabled
      if (autoSpeak) {
        setTimeout(() => {
          handleSpeak(newGreeting);
        }, 500);
      }
    }
  }, [isOpen, userData]);

  // Auto-speak greeting when Hana is first opened (fallback for no user data)
  useEffect(() => {
    if (isOpen && messages.length === 1 && autoSpeak && !userData) {
      setTimeout(() => {
        handleSpeak(messages[0].text);
      }, 500);
    }
  }, [isOpen, userData]);

  // Initialize speech recognition
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;

      // Set language based on selected language
      const languageMap: Record<Language, string> = {
        en: 'en-US',
        zh: 'zh-CN',
      };
      recognitionRef.current.lang = languageMap[language];

      recognitionRef.current.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0].transcript)
          .join('');
        setInput(transcript);
        console.log('[Hana] Speech recognized:', transcript);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('[Hana] Speech recognition error:', event.error);
        setIsRecording(false);
      };

      recognitionRef.current.onend = () => {
        setIsRecording(false);
      };
    }
  }, [language]);

  const handleStartRecording = () => {
    if (recognitionRef.current) {
      console.log('[Hana] Starting speech recognition');
      setIsRecording(true);
      recognitionRef.current.start();
    } else {
      alert('Speech recognition not supported in your browser');
    }
  };

  const handleStopRecording = () => {
    if (recognitionRef.current) {
      console.log('[Hana] Stopping speech recognition');
      recognitionRef.current.stop();
    }
  };

  const handleSpeak = async (text: string) => {
    try {
      console.log('[Hana] Speaking text for language:', language);
      // Save text for potential resume on unmute
      lastSpokenTextRef.current = text;

      // Use Web Speech API directly for guaranteed female voice
      // Wait for voices to load if needed
      if (window.speechSynthesis.getVoices().length === 0) {
        console.log('[Hana] Voices not loaded yet, waiting...');
        await new Promise(resolve => {
          const onVoicesChanged = () => {
            window.speechSynthesis.removeEventListener('voiceschanged', onVoicesChanged);
            resolve(true);
          };
          window.speechSynthesis.addEventListener('voiceschanged', onVoicesChanged);
          setTimeout(() => {
            window.speechSynthesis.removeEventListener('voiceschanged', onVoicesChanged);
            resolve(true);
          }, 2000);
        });
      }
      fallbackBrowserTTS(text);
    } catch (error: any) {
      console.error('[Hana] Error:', error.message);
      setIsSpeaking(false);
    }
  };

  const speakWithQwenTTS = async (text: string) => {
    try {
      setIsSpeaking(true);

      console.log('[Hana] Using Alibaba Qwen TTS for language:', language);

      // Call backend Alibaba Qwen TTS endpoint
      const response = await axios.post(
        '/api/chat/hana/speak',
        { text, language },
        { headers: { 'Content-Type': 'application/json' } }
      );

      if (response.data?.data?.audio) {
        const audioUrl = response.data.data.audio;
        const audio = new Audio(audioUrl);

        audio.onplay = () => {
          console.log('[Hana] Qwen TTS playing');
        };

        audio.onended = () => {
          console.log('[Hana] Qwen TTS finished');
          setIsSpeaking(false);
        };

        audio.onerror = (error: any) => {
          console.error('[Hana] Qwen TTS error:', error);
        };

        audio.play().catch((error: any) => {
          console.error('[Hana] Failed to play Qwen TTS:', error);
        });
      } else {
        console.error('[Hana] No audio in response');
      }
    } catch (error: any) {
      console.error('[Hana] Qwen TTS exception:', error.message);
    }
  };

  const speakWithBrowserTTS = (text: string) => {
    // All languages use native Web Speech API for guaranteed female voice control
    console.log('[Hana] Using native Web Speech for all languages');
    fallbackBrowserTTS(text);
  };

  const fallbackBrowserTTS = (text: string) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);

    const languageMap: Record<Language, string> = {
      en: 'en-SG',
      zh: 'zh-CN',
      yue: 'zh-HK',
    };

    const targetLang = languageMap[language];
    utterance.lang = targetLang;

    // Get available voices
    const voices = window.speechSynthesis.getVoices();

    // Filter voices for exact language match
    let matchingVoices = voices.filter(v => {
      const voiceLang = v.lang.toLowerCase();
      // For Cantonese, match zh-HK specifically
      if (language === 'yue') {
        return voiceLang.includes('zh-hk') || voiceLang.includes('yue');
      }
      // For Mandarin, match any Chinese voice except HK
      if (language === 'zh') {
        return voiceLang.includes('zh') && !voiceLang.includes('hk');
      }
      // For English, match en-SG or just en
      return voiceLang.startsWith('en');
    });

    console.log('[Hana] Language:', language, 'Target Lang:', targetLang);
    console.log('[Hana] Matching voices:', matchingVoices.map(v => ({ name: v.name, lang: v.lang })));

    // Blacklist male voices and select warm, comforting female voice
    const malePatterns = ['Li-Mu', 'Lü-Si', 'Lu-Si', 'male', 'man', 'david', 'google uk english', 'alex', 'bruce', 'junior', 'tom', 'george', 'rishi'];

    // Priority female voice patterns (smooth, warm, younger-sounding female)
    const priorityFemalePatterns = ['joelle', 'joanna', 'zira', 'ava', 'clara', 'ivy', 'nova', 'rose', 'sophia', 'victoria', 'samantha', 'mei-jia', 'hui-shan', 'yating', 'ting-ting', 'sirine', 'moira', 'siri'];
    const allFemalePatterns = [...priorityFemalePatterns, 'sin-ji', 'female', 'woman', 'karen'];

    // Priority 1: Find voices with explicit warm female patterns
    let selectedVoice = matchingVoices.find(v =>
      priorityFemalePatterns.some(pattern => v.name.toLowerCase().includes(pattern.toLowerCase()))
    );

    // Priority 2: Find any voice with female patterns
    if (!selectedVoice) {
      selectedVoice = matchingVoices.find(v =>
        allFemalePatterns.some(pattern => v.name.toLowerCase().includes(pattern.toLowerCase()))
      );
    }

    // Priority 3: Filter out male voices using negative patterns
    if (!selectedVoice) {
      // Aggressive male filtering: exclude anything that looks male
      const femaleVoices = matchingVoices.filter(v => {
        const voiceName = v.name.toLowerCase();
        // Exclude if matches male pattern
        if (malePatterns.some(pattern => voiceName.includes(pattern.toLowerCase()))) {
          return false;
        }
        // Exclude common male voice names
        if (['google us english', 'daniel', 'gordon', 'daniel', 'bad', 'default'].some(m => voiceName.includes(m))) {
          return false;
        }
        return true;
      });

      console.log('[Hana] Female voices after filtering:', femaleVoices.map(v => v.name));

      if (femaleVoices.length > 0) {
        selectedVoice = femaleVoices[0];
      }
    }

    // Last resort - check if we have voices with "female" in name first
    if (!selectedVoice) {
      const explicitFemale = voices.find(v =>
        v.name.toLowerCase().includes('female') || v.name.toLowerCase().includes('woman')
      );
      if (explicitFemale) {
        selectedVoice = explicitFemale;
        console.log('[Hana] Using explicit female voice as last resort:', explicitFemale.name);
      }
    }

    // Absolute last resort - use any voice
    if (!selectedVoice) {
      selectedVoice = matchingVoices[0];
      console.warn('[Hana] WARNING: Using potentially male voice as last resort:', selectedVoice?.name);
    }

    if (selectedVoice) {
      utterance.voice = selectedVoice;
      console.log('[Hana] SELECTED voice for', language + ':', selectedVoice.name, 'lang:', selectedVoice.lang);
    } else {
      console.warn('[Hana] No voice selected! All available voices:', voices.map(v => ({ name: v.name, lang: v.lang })));
    }

    // Adjust voice settings by language - warm, comforting, motherly female voice
    if (language === 'zh' || language === 'yue') {
      // Chinese (Mandarin & Cantonese): warm, gentle, motherly
      utterance.rate = 0.85;        // Slightly slower for clarity and warmth
      utterance.pitch = 1.1;        // Warm female pitch
      utterance.volume = 1.0;       // Full volume for clarity
    } else {
      // English: warm, comforting female voice
      utterance.rate = 1.0;         // Natural pace
      utterance.pitch = 1.2;        // Warm female pitch
      utterance.volume = 1.0;       // Full volume for clarity
    }

    utterance.onstart = () => {
      console.log('[Hana] Speaking in', language, 'with voice:', utterance.voice?.name);
      setIsSpeaking(true);
    };

    utterance.onend = () => {
      console.log('[Hana] Finished speaking');
      setIsSpeaking(false);
    };

    utterance.onerror = (event: any) => {
      console.error('[Hana] TTS error:', event.error);
      setIsSpeaking(false);
    };

    window.speechSynthesis.speak(utterance);
  };

  // Detect if user is using Singlish or other languages
  const detectLanguage = (text: string): Language => {
    const lower = text.toLowerCase();
    // Singlish markers: lah, lor, leh, meh, what, lor lor
    const singlishMarkers = /\b(lah|lor|leh|meh|lor\s+lor|what|lor\s*,|mah|lor\s+lor|lor\s*\?|lor\s+lor\s+lor)\b/i;
    if (singlishMarkers.test(text)) {
      return 'en'; // Respond in English for Singlish
    }

    // Chinese markers
    if (/[一-鿿]/.test(text)) {
      // Check for Cantonese
      if (/[呀嗎啦嘅佢嗰度啦]/i.test(text)) {
        return 'yue'; // Cantonese
      }
      return 'zh'; // Mandarin
    }

    return language; // Use selected language
  };

  const handleSendMessage = async () => {
    console.log('[Hana] Send button clicked, input:', input);
    if (!input.trim()) return;

    // Detect language from user input
    const detectedLang = detectLanguage(input);
    console.log('[Hana] Detected language:', detectedLang, 'Selected:', language);

    const userMessage: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setShowQuickReplies(false);
    lastUserMessageRef.current = input; // Store for retry

    try {
      // Check for intent first - give instant answers for common questions
      const intent = detectIntent(input);
      let reply = '';

      // Check if user is asking about their errands or account
      const isErrandRelated = /errand|task|bid|status|active|my.*errand|my.*task|check.*errand/.test(input.toLowerCase());
      const isUserRelated = /my.*account|profile|wallet|balance|earned|information|details/.test(input.toLowerCase());

      console.log('[Hana] isErrandRelated:', isErrandRelated, 'errands.length:', errands.length, 'errands:', errands);

      if (isErrandRelated && errands.length > 0) {
        // Provide errand status - count by role
        const activeAskerErrands = errands.filter(e => e.role === 'asker' && e.status !== 'completed' && e.status !== 'cancelled');
        const activeDoerErrands = errands.filter(e => e.role === 'doer' && e.status !== 'completed' && e.status !== 'cancelled');
        console.log('[Hana] Filtering errands:');
        console.log('[Hana] - All errands:', errands.length);
        console.log('[Hana] - Asker errands (role=asker):', errands.filter(e => e.role === 'asker').length);
        console.log('[Hana] - Doer errands (role=doer):', errands.filter(e => e.role === 'doer').length);
        console.log('[Hana] - Active Asker (not completed/cancelled):', activeAskerErrands.length);
        console.log('[Hana] - Active Doer (not completed/cancelled):', activeDoerErrands.length);
        console.log('[Hana] activeAskerErrands:', activeAskerErrands, 'activeDoerErrands:', activeDoerErrands);

        if (activeAskerErrands.length > 0 || activeDoerErrands.length > 0) {
          const totalActive = activeAskerErrands.length + activeDoerErrands.length;

          reply = detectedLang === 'zh'
            ? `你有 ${totalActive} 个活跃任务：${activeAskerErrands.length} 个作为发布者，${activeDoerErrands.length} 个作为执行者。点击下面查看详情。`
            : `You have ${totalActive} active errand(s): ${activeAskerErrands.length} as an Asker, ${activeDoerErrands.length} as a Doer. Click below to view details.`;

          // Add action buttons to view errands
          const msgObj: Message = {
            id: Date.now().toString(),
            sender: 'hana',
            text: reply,
            timestamp: new Date(),
            actions: [
              { label: activeAskerErrands.length > 0 ? `View Asker Errands (${activeAskerErrands.length})` : undefined as any, action: '/errands' },
              { label: activeDoerErrands.length > 0 ? `View Doer Errands (${activeDoerErrands.length})` : undefined as any, action: '/my-offer' },
            ].filter(a => a.label),
          };
          setMessages((prev) => [...prev, msgObj]);

          if (autoSpeak) {
            setTimeout(() => {
              handleSpeak(reply);
            }, 300);
          }
          setIsLoading(false);
          return;
        } else {
          reply = detectedLang === 'zh'
            ? `你现在没有活跃的任务。想发布一个新的吗？`
            : `You don't have any active errands right now. Want to post a new one?`;
        }
      } else if (isUserRelated && userData) {
        // Provide user account information
        reply = detectedLang === 'zh'
          ? `你的账户信息：\n👤 名称: ${userData.display_name || userData.name || '用户'}\n💰 钱包余额: ¥${wallet.toFixed(2)}\n📧 邮箱: ${userData.email || '未设置'}\n📱 电话: ${userData.phone || '未设置'}\n\n需要其他帮助吗？`
          : `Your account info:\n👤 Name: ${userData.display_name || userData.name || 'User'}\n💰 Wallet: $${wallet.toFixed(2)}\n📧 Email: ${userData.email || 'Not set'}\n📱 Phone: ${userData.phone || 'Not set'}\n\nNeed anything else?`;
      } else if (intent && INTENT_RESPONSES[detectedLang] && INTENT_RESPONSES[detectedLang][intent]) {
        // Use intent-based response (instant, no API call needed)
        console.log('[Hana] Intent detected:', intent, '- using instant response');
        reply = INTENT_RESPONSES[detectedLang][intent];
      } else {
        // Fall back to API for conversational responses
        const token = localStorage.getItem('token');
        const headers: any = { 'Content-Type': 'application/json' };
        if (token) {
          headers.Authorization = `Bearer ${token}`;
        }

        // Build context from recent messages (memory)
        const recentMessages = messages.slice(-CONTEXT_MEMORY_LIMIT).map(m => ({
          role: m.sender === 'user' ? 'user' : 'assistant',
          content: m.text
        }));

        // Add user context to API request
        const userContext = userData ? `User: ${userData.display_name || userData.name}, Active Errands: ${errands.filter(e => e.status !== 'completed').length}` : '';

        console.log('[Hana] Making API call with detected language:', detectedLang);
        const response = await axios.post(
          '/api/chat/hana/customer-service',
          {
            message: input,
            language: detectedLang,
            context: recentMessages, // Send context for better responses
            userContext: userContext,
            userId: userData?.id
          },
          { headers }
        );

        console.log('[Hana] Got response:', response.data);
        reply = response.data?.data?.reply || response.data?.reply || 'How else can I help?';
        console.log('[Hana] Reply text:', reply);
      }

      const hanaMessage: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'hana',
        text: reply,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, hanaMessage]);
      setRetryCount(0); // Reset retry count on success
      setShowQuickReplies(true); // Show quick replies after response

      // Auto-play Hana's response if enabled
      if (autoSpeak) {
        setTimeout(() => {
          handleSpeak(reply);
        }, 500);
      }
    } catch (error: any) {
      console.error('Failed to get Hana response:', error.response?.data || error.message);

      // Improved error recovery with retry logic
      let errorText = "Sorry, I'm having trouble responding right now.";
      if (retryCount < 2) {
        errorText += ` Let me try again...`;
        setRetryCount(prev => prev + 1);
        // Auto-retry after 2 seconds
        setTimeout(() => {
          setInput(lastUserMessageRef.current);
          handleSendMessage();
        }, 2000);
      } else {
        errorText += " Please try again or contact togather@errandify.ai.";
        setRetryCount(0);
      }

      const errorMessage: Message = {
        id: (Date.now() + 2).toString(),
        sender: 'hana',
        text: errorText,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
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
          className="floating-button fixed bottom-24 right-6 w-12 h-12 bg-white rounded-full hover:shadow-lg transition-all hover:scale-105 flex items-center justify-center z-50 overflow-hidden border-2 border-errandify-orange active:scale-95"
          style={{
            boxShadow: '0 3px 0 rgba(0,0,0,0.15), 0 4px 8px rgba(0,0,0,0.1)',
          }}
          title="Chat with Hana"
        >
          <img
            src="/images/hana-avatar.png"
            alt="Hana"
            className="w-full h-full object-cover"
          />
        </button>
      )}

      {/* Modal */}
      {isOpen && !isMinimized && (
        <div className="fixed bottom-24 right-6 z-50 max-h-96 overflow-hidden">
          {/* Close Button */}
          <button
            onClick={handleClose}
            className="absolute top-2 right-2 z-10 w-6 h-6 bg-gray-200 hover:bg-gray-300 rounded-full flex items-center justify-center text-gray-700 font-bold"
          >
            ✕
          </button>

          {/* Speaker Toggle Button */}
          <button
            onClick={() => {
              const newState = !autoSpeak;
              setAutoSpeak(newState);

              if (!newState) {
                // Muting: cancel any ongoing speech immediately
                window.speechSynthesis.cancel();
              } else {
                // Unmuting: resume speaking the last text if available
                if (lastSpokenTextRef.current) {
                  handleSpeak(lastSpokenTextRef.current);
                }
              }
            }}
            className={`absolute top-2 right-9 z-10 w-6 h-6 rounded-full flex items-center justify-center font-bold text-sm transition-colors ${
              autoSpeak
                ? 'bg-errandify-orange text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
            title={autoSpeak ? 'Disable audio' : 'Enable audio'}
          >
            {autoSpeak ? '🔊' : '🔇'}
          </button>

          {/* Minimize Button */}
          <button
            onClick={() => setIsMinimized(true)}
            className="absolute top-2 right-16 z-10 w-6 h-6 bg-gray-200 hover:bg-gray-300 rounded-full flex items-center justify-center text-gray-700 font-bold text-sm"
          >
            −
          </button>

          <div className="w-80 h-96 bg-white rounded-lg shadow-2xl flex flex-col overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-errandify-orange to-orange-600 text-white p-4 flex items-center gap-3">
              <img
                src="/images/hana-avatar.png"
                alt="Sister Hana"
                className="w-10 h-10 rounded-full object-cover flex-shrink-0"
              />
              <div>
                <h2 className="font-bold text-sm">Sister Hana</h2>
                <p className="text-xs opacity-90">How can I help you today?</p>
              </div>
            </div>

            {/* Language Selector */}
            <div className="border-b border-gray-200 px-3 py-2 bg-gray-50 flex gap-2">
              {(Object.keys(LANGUAGE_NAMES) as Language[]).map((lang) => (
                <button
                  key={lang}
                  onClick={() => {
                    if (language !== lang) {
                      // Get greeting for new language
                      const newGreeting = getGreeting(lang);
                      console.log('[Hana] Language toggle:', { from: language, to: lang, greeting: newGreeting });

                      // Update language
                      setLanguage(lang);

                      // Update messages immediately
                      setMessages([
                        {
                          id: '1',
                          sender: 'hana',
                          text: newGreeting,
                          timestamp: new Date(),
                        },
                      ]);

                      // Auto-speak the greeting in the new language if autoSpeak is enabled
                      if (autoSpeak) {
                        setTimeout(() => {
                          handleSpeak(newGreeting);
                        }, 300);
                      }
                    }
                  }}
                  className={`text-xs px-2 py-1 rounded-full transition-all ${
                    language === lang
                      ? 'bg-errandify-orange text-white font-semibold'
                      : 'bg-white border border-gray-300 text-gray-700 hover:border-errandify-orange'
                  }`}
                >
                  {LANGUAGE_NAMES[lang]}
                </button>
              ))}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-2 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.sender === 'hana' && (
                    <img
                      src="/images/hana-avatar.png"
                      alt="Hana"
                      className="w-6 h-6 rounded-full object-cover flex-shrink-0 mt-1"
                    />
                  )}
                  <div>
                    <div
                      className={`max-w-xs px-3 py-1.5 rounded-lg text-xs ${
                        msg.sender === 'user'
                          ? 'bg-errandify-orange text-white'
                          : 'bg-white text-gray-800 border border-gray-200'
                      }`}
                    >
                      {msg.text}
                    </div>
                    {msg.suggestedCategory && msg.sender === 'hana' && (
                      <div className="mt-2 flex gap-2">
                        <button
                          onClick={() => {
                            window.location.href = `/create-errand?category=${msg.suggestedCategory}`;
                          }}
                          className="text-xs bg-orange-100 hover:bg-errandify-orange hover:text-white text-errandify-orange px-3 py-1 rounded-full font-semibold transition-colors"
                        >
                          📝 Post {msg.suggestedCategory}
                        </button>
                      </div>
                    )}
                    {msg.actions && msg.actions.length > 0 && msg.sender === 'hana' && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {msg.actions.map((action, idx) => (
                          <button
                            key={idx}
                            onClick={() => {
                              window.location.href = action.action;
                            }}
                            className="text-xs bg-orange-100 hover:bg-errandify-orange hover:text-white text-errandify-orange px-3 py-1 rounded-full font-semibold transition-colors"
                          >
                            📋 {action.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-2 justify-start">
                  <img
                    src="/images/hana-avatar.png"
                    alt="Hana"
                    className="w-6 h-6 rounded-full object-cover flex-shrink-0 mt-1"
                  />
                  <div className="bg-white text-gray-800 px-4 py-2 rounded-lg border border-gray-200">
                    <div className="flex space-x-2">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200"></div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Replies */}
            {showQuickReplies && (
              <div className="px-3 py-2 bg-orange-50 border-t border-orange-200 flex flex-wrap gap-2">
                {QUICK_REPLIES[language].slice(0, 4).map((reply, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleQuickReply(reply.action)}
                    className="text-xs px-3 py-1 bg-white border border-errandify-orange text-errandify-orange rounded-full hover:bg-errandify-orange hover:text-white transition-colors font-semibold"
                  >
                    {reply.label}
                  </button>
                ))}
              </div>
            )}

            {/* Input */}
            <div className="border-t p-3 bg-white flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Ask Hana..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:border-errandify-orange"
                disabled={isLoading || isRecording}
              />
              {/* Audio Input Button */}
              <button
                onClick={isRecording ? handleStopRecording : handleStartRecording}
                className={`px-3 py-2 rounded-lg text-white font-semibold transition-all text-xs ${
                  isRecording
                    ? 'bg-red-500 hover:bg-red-600 animate-pulse'
                    : 'bg-orange-500 hover:bg-orange-600'
                } disabled:opacity-50`}
                title={isRecording ? 'Stop recording' : 'Start voice input'}
              >
                🎤
              </button>
              {/* Send Button */}
              <button
                onClick={handleSendMessage}
                disabled={isLoading || !input.trim()}
                className="px-3 py-2 bg-errandify-orange text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-xs font-semibold"
              >
                →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Minimized State */}
      {isOpen && isMinimized && (
        <button
          onClick={() => setIsMinimized(false)}
          className="floating-button fixed bottom-24 right-6 w-12 h-12 bg-white rounded-full transition-all hover:scale-105 flex items-center justify-center z-50 overflow-hidden border-2 border-errandify-orange ring-2 ring-orange-300 active:scale-95"
          style={{
            boxShadow: '0 3px 0 rgba(0,0,0,0.15), 0 4px 8px rgba(0,0,0,0.1)',
          }}
          title="Chat with Hana"
        >
          <img
            src="/images/hana-avatar.png"
            alt="Hana"
            className="w-full h-full object-cover"
          />
        </button>
      )}
    </>
  );
}
