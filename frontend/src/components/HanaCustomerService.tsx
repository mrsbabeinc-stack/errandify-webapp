import { useState, useRef, useEffect } from 'react';
import axios from 'axios';

interface Message {
  id: string;
  sender: 'user' | 'hana';
  text: string;
  timestamp: Date;
}

type Language = 'en' | 'zh' | 'yue';

const LANGUAGE_NAMES: Record<Language, string> = {
  en: '🇬🇧 English',
  zh: '🇨🇳 中文',
  yue: '🇭🇰 粵語',
};

const LANGUAGE_PROMPTS: Record<Language, string> = {
  en: 'Reply in English.',
  zh: '用中文回复。',
  yue: '用粵語回復。',
};

export default function HanaCustomerService() {
  console.log('[Hana] Component mounted');
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [language, setLanguage] = useState<Language>('en');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      sender: 'hana',
      text: language === 'yue'
        ? '你好呀! 我係Hana，帮帮乐嘅助手。有咩我可以幫你嘅呢?'
        : language === 'zh'
        ? '你好! 我是Hana，帮帮乐的助手。有什么我可以帮你的呢?'
        : "Hi there! I'm Hana, your Errandify assistant. How can I help you today?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesisUtterance | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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
        yue: 'zh-HK',
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
      setIsSpeaking(true);
      console.log('[Hana] Speaking text for language:', language);

      // For Chinese, use Google Translate TTS (guaranteed female voice)
      if (language === 'zh' || language === 'yue') {
        speakWithGoogleTranslateTTS(text);
      } else {
        speakWithBrowserTTS(text);
      }
    } catch (error: any) {
      console.error('[Hana] Error:', error.message);
      setIsSpeaking(false);
    }
  };

  const speakWithGoogleTranslateTTS = (text: string) => {
    try {
      setIsSpeaking(true);

      // Map language to Google Translate language code
      const langMap: Record<Language, string> = {
        en: 'en',
        zh: 'zh-CN',
        yue: 'zh-TW', // Google Translate uses zh-TW for Cantonese
      };

      const lang = langMap[language];

      // Use Google Translate's text-to-speech API
      // Format: https://translate.google.com/translate_tts?ie=UTF-8&q=TEXT&tl=LANG&client=tw-ob
      const encodedText = encodeURIComponent(text);
      const audioUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodedText}&tl=${lang}&client=tw-ob`;

      console.log('[Hana] Using Google Translate TTS for language:', lang);

      const audio = new Audio(audioUrl);

      audio.onplay = () => {
        console.log('[Hana] Google TTS playing');
      };

      audio.onended = () => {
        console.log('[Hana] Google TTS finished');
        setIsSpeaking(false);
      };

      audio.onerror = (error: any) => {
        console.error('[Hana] Google TTS error:', error);
        console.log('[Hana] Falling back to native TTS');
        fallbackBrowserTTS(text);
      };

      audio.play().catch((error: any) => {
        console.error('[Hana] Failed to play Google TTS:', error);
        fallbackBrowserTTS(text);
      });
    } catch (error: any) {
      console.error('[Hana] Google TTS exception:', error.message);
      fallbackBrowserTTS(text);
    }
  };

  const speakWithBrowserTTS = (text: string) => {
    // For Chinese, ALWAYS use native Web Speech API (better female voice)
    if (language === 'zh' || language === 'yue') {
      console.log('[Hana] Using native Web Speech for Chinese/Cantonese - skipping ResponsiveVoice');
      fallbackBrowserTTS(text);
      return;
    }

    // For English, use ResponsiveVoice
    const responsiveVoice = (window as any).responsiveVoice;

    if (responsiveVoice && responsiveVoice.isReady) {
      console.log('[Hana] Using ResponsiveVoice for English');

      responsiveVoice.speak(text, 'Singapore Female', {
        rate: 1.1, // Slightly slower for warmth
        pitch: 1.2, // High but natural pitch
        volume: 1.0,
        onstart: () => {
          console.log('[Hana] Speaking');
          setIsSpeaking(true);
        },
        onend: () => {
          console.log('[Hana] Done');
          setIsSpeaking(false);
        },
        onerror: (error: any) => {
          console.error('[Hana] Error:', error);
          setIsSpeaking(false);
        },
      });
    } else {
      console.log('[Hana] ResponsiveVoice not ready');
      fallbackBrowserTTS(text);
    }
  };

  const fallbackBrowserTTS = (text: string) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);

    const languageMap: Record<Language, string> = {
      en: 'en-SG',
      zh: 'zh-CN',
      yue: 'zh-HK',
    };
    utterance.lang = languageMap[language];

    // Get available voices
    const voices = window.speechSynthesis.getVoices();
    console.log('[Hana] Available voices for', language + ':', voices.filter(v => v.lang.includes(languageMap[language].split('-')[0])).map(v => v.name));

    const targetLang = languageMap[language].split('-')[0];
    const matchingVoices = voices.filter(v => v.lang.toLowerCase().startsWith(targetLang.toLowerCase()));

    // For Chinese, prefer female voices (Mei-Jia, Sin-Ji, Victoria, etc.) - avoid male names
    const maleNames = ['Li-Mu', 'Lü-Si', 'Lu-Si', 'Ting-Ting', 'Fang-Fang'];
    let selectedVoice = matchingVoices.find(v => !maleNames.some(m => v.name.includes(m)));

    // If no female voice found, try to skip the first one (often male)
    if (!selectedVoice && matchingVoices.length > 1) {
      selectedVoice = matchingVoices[1];
    } else if (!selectedVoice && matchingVoices.length > 0) {
      selectedVoice = matchingVoices[0];
    }

    if (selectedVoice) {
      utterance.voice = selectedVoice;
      console.log('[Hana] Selected female voice for', language + ':', selectedVoice.name);
    } else {
      console.log('[Hana] No voice found for language:', language);
    }

    // Warm, passionate 20-year-old Chinese voice (not sharp, very caring)
    if (language === 'zh' || language === 'yue') {
      utterance.rate = 0.85; // Much slower for warmth and passion
      utterance.pitch = 1.15; // Lower pitch (less sharp), more natural and warm
      utterance.volume = 1.0;
    } else {
      utterance.rate = 0.95;
      utterance.pitch = 1.3;
      utterance.volume = 1.0;
    }

    utterance.onstart = () => {
      console.log('[Hana] TTS started with voice:', utterance.voice?.name);
      setIsSpeaking(true);
    };

    utterance.onend = () => {
      console.log('[Hana] TTS finished');
      setIsSpeaking(false);
    };

    utterance.onerror = (event: any) => {
      console.error('[Hana] TTS error:', event.error);
      setIsSpeaking(false);
    };

    window.speechSynthesis.speak(utterance);
  };

  const handleSendMessage = async () => {
    console.log('[Hana] Send button clicked, input:', input);
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const token = localStorage.getItem('token');
      const headers: any = { 'Content-Type': 'application/json' };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      console.log('[Hana] Making API call to /api/chat/hana/customer-service with language:', language);
      const response = await axios.post(
        '/api/chat/hana/customer-service',
        { message: input, language },
        { headers }
      );

      console.log('[Hana] Got response:', response.data);
      const reply = response.data?.data?.reply || response.data?.reply || 'How else can I help?';
      console.log('[Hana] Reply text:', reply);
      const hanaMessage: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'hana',
        text: reply,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, hanaMessage]);

      // Auto-play Hana's response if enabled
      if (autoSpeak) {
        setTimeout(() => {
          handleSpeak(reply);
        }, 500);
      }
    } catch (error: any) {
      console.error('Failed to get Hana response:', error.response?.data || error.message);
      const errorMessage: Message = {
        id: (Date.now() + 2).toString(),
        sender: 'hana',
        text: "Sorry, I'm having trouble responding right now. Please try again or contact support@errandify.ai.",
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
          className="fixed bottom-20 right-6 w-14 h-14 bg-white rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-110 flex items-center justify-center z-50 overflow-hidden border-2 border-errandify-orange"
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
        <div className="fixed bottom-20 right-6 z-50 max-h-96 overflow-hidden">
          {/* Close Button */}
          <button
            onClick={handleClose}
            className="absolute top-2 right-2 z-10 w-6 h-6 bg-gray-200 hover:bg-gray-300 rounded-full flex items-center justify-center text-gray-700 font-bold"
          >
            ✕
          </button>

          {/* Speaker Toggle Button */}
          <button
            onClick={() => setAutoSpeak(!autoSpeak)}
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
                  onClick={() => setLanguage(lang)}
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
                  <div
                    className={`max-w-xs px-4 py-2 rounded-lg text-sm ${
                      msg.sender === 'user'
                        ? 'bg-errandify-orange text-white'
                        : 'bg-white text-gray-800 border border-gray-200'
                    }`}
                  >
                    {msg.text}
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

            {/* Input */}
            <div className="border-t p-3 bg-white flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Ask Hana..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-errandify-orange"
                disabled={isLoading || isRecording}
              />
              {/* Audio Input Button */}
              <button
                onClick={isRecording ? handleStopRecording : handleStartRecording}
                className={`px-3 py-2 rounded-lg text-white font-semibold transition-all ${
                  isRecording
                    ? 'bg-red-500 hover:bg-red-600 animate-pulse'
                    : 'bg-blue-500 hover:bg-blue-600'
                } disabled:opacity-50`}
                title={isRecording ? 'Stop recording' : 'Start voice input'}
              >
                🎤
              </button>
              {/* Send Button */}
              <button
                onClick={handleSendMessage}
                disabled={isLoading || !input.trim()}
                className="px-3 py-2 bg-errandify-orange text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-semibold"
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
          className="fixed bottom-20 right-6 w-14 h-14 bg-white rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-110 flex items-center justify-center z-50 overflow-hidden border-2 border-errandify-orange ring-2 ring-orange-300"
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
