import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from './Toast';
import { COMPREHENSIVE_FAQ, FAQ_TOPICS, Language, FAQItem } from '../data/HanaFAQDatabase';

interface Errand {
  id: number;
  title: string;
  status: string;
  category: string;
  budget: number;
  deadline: string;
}

interface Message {
  id: string;
  sender: 'user' | 'hana';
  text: string;
  timestamp: Date;
  type?: 'text' | 'faq' | 'errand-context';
}

type MessageLanguage = 'en' | 'zh' | 'yue';

const HanaLeftSidebar: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [isExpanded, setIsExpanded] = useState(true);
  const [language, setLanguage] = useState<MessageLanguage>('en');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [userErrands, setUserErrands] = useState<Errand[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load user errands from localStorage
  useEffect(() => {
    const errands = localStorage.getItem('user_errands');
    if (errands) {
      try {
        setUserErrands(JSON.parse(errands));
      } catch (e) {
        console.error('Failed to load errands:', e);
      }
    }
  }, []);

  // Initial greeting
  useEffect(() => {
    if (messages.length === 0) {
      const greeting = getGreeting(language);
      addMessage('hana', greeting);
    }
  }, [language]);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const getGreeting = (lang: MessageLanguage): string => {
    const greetings = {
      en: "👋 Hi! I'm Hana. Ask me about Errandify, or I can help with your active errands!",
      zh: "👋 你好！我是Hana。有什么我可以帮你的吗？",
      yue: "👋 你好呀！我係Hana。有咩我可以幫你嘅嗎？",
    };
    return greetings[lang];
  };

  const addMessage = (sender: 'user' | 'hana', text: string, type: 'text' | 'faq' | 'errand-context' = 'text') => {
    const newMessage: Message = {
      id: Date.now().toString(),
      sender,
      text,
      timestamp: new Date(),
      type,
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const searchFAQ = (query: string): FAQItem[] => {
    const lowerQuery = query.toLowerCase();
    return COMPREHENSIVE_FAQ.filter(item => {
      const question = (item.question[language] || item.question.en).toLowerCase();
      const answer = (item.answer[language] || item.answer.en).toLowerCase();
      const tags = item.tags.join(' ').toLowerCase();
      return question.includes(lowerQuery) || answer.includes(lowerQuery) || tags.includes(lowerQuery);
    });
  };

  const getErrandContextHelp = (): string => {
    if (userErrands.length === 0) {
      return language === 'en'
        ? "You don't have active errands. Want to post one?"
        : language === 'zh'
        ? "你没有活跃的任务。想发布一个吗？"
        : "你冇活躍嘅幫幫。想發佈一個嗎？";
    }

    const activeErrands = userErrands.filter(e =>
      e.status !== 'completed' && e.status !== 'cancelled'
    );

    if (activeErrands.length === 0) {
      return language === 'en'
        ? "All your errands are done!"
        : language === 'zh'
        ? "你的所有任务都已完成！"
        : "你嘅所有幫幫都已完成！";
    }

    return language === 'en'
      ? `You have ${activeErrands.length} active errand(s): ${activeErrands.map(e => `"${e.title}"`).join(', ')}`
      : language === 'zh'
      ? `你有${activeErrands.length}个活跃任务：${activeErrands.map(e => `"${e.title}"`).join('、')}`
      : `你有${activeErrands.length}個活躍幫幫：${activeErrands.map(e => `"${e.title}"`).join('、')}`;
  };

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = input.trim();
    addMessage('user', userMessage);
    setInput('');
    setIsLoading(true);

    setTimeout(() => {
      const faqMatches = searchFAQ(userMessage);

      if (faqMatches.length > 0) {
        const topMatch = faqMatches[0];
        const answer = topMatch.answer[language] || topMatch.answer.en;
        addMessage('hana', answer, 'faq');
      } else if (
        userMessage.toLowerCase().includes('errand') ||
        userMessage.toLowerCase().includes('task') ||
        userMessage.toLowerCase().includes('bid')
      ) {
        const errandHelp = getErrandContextHelp();
        addMessage('hana', errandHelp, 'errand-context');
      } else {
        const fallback = language === 'en'
          ? "Try asking about posting, offering, payment, safety, or disputes!"
          : language === 'zh'
          ? "尝试提问发布、出价、付款、安全或纠纷相关的问题！"
          : "嘗試提問發佈、出價、付款、安全或爭議相關嘅問題！";
        addMessage('hana', fallback);
      }

      setIsLoading(false);
    }, 600);
  };

  const handleCategorySelect = (categoryId: string) => {
    const categoryItems = COMPREHENSIVE_FAQ.filter(item => item.category === categoryId);
    if (categoryItems.length > 0) {
      const categoryName = FAQ_TOPICS[categoryId as keyof typeof FAQ_TOPICS] || categoryId;
      const responseText = language === 'en'
        ? `Found ${categoryItems.length} articles about ${categoryName}`
        : language === 'zh'
        ? `找到${categoryItems.length}篇关于${categoryName}的文章`
        : `搵到${categoryItems.length}篇關於${categoryName}嘅文章`;

      addMessage('hana', responseText);
      setSelectedCategory(categoryId);
    }
  };

  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className="fixed left-0 top-20 bg-orange-500 hover:bg-orange-600 text-white px-2 py-4 rounded-r-lg shadow-lg transition-all z-30"
        title="Open Hana"
      >
        💬
      </button>
    );
  }

  return (
    <div className="fixed left-0 top-16 bottom-20 w-72 bg-white border-r border-gray-200 flex flex-col shadow-lg z-30 transition-all">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500 to-orange-400 text-white px-4 py-3 flex justify-between items-center border-b border-orange-600">
        <div className="flex items-center gap-2">
          <span className="text-xl">🤖</span>
          <span className="font-bold text-sm">Hana</span>
        </div>
        <div className="flex items-center gap-1">
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as MessageLanguage)}
            className="px-2 py-1 text-xs rounded bg-orange-600 text-white border-none cursor-pointer"
          >
            <option value="en">EN</option>
            <option value="zh">中文</option>
            <option value="yue">粵語</option>
          </select>
          <button
            onClick={() => setIsExpanded(false)}
            className="px-2 py-1 hover:bg-orange-600 rounded transition-colors text-sm"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2 bg-gray-50">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`px-3 py-2 rounded-lg text-sm max-w-xs ${
                msg.sender === 'user'
                  ? 'bg-orange-500 text-white rounded-br-none'
                  : 'bg-gray-200 text-gray-800 rounded-bl-none'
              }`}
              style={{ wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}
            >
              {msg.text}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="px-3 py-2 rounded-lg text-sm bg-gray-200 text-gray-600 rounded-bl-none">
              ⏳
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Category Quick Access */}
      {selectedCategory === null && messages.length <= 1 && (
        <div className="px-2 py-2 border-t border-gray-200 bg-white max-h-20 overflow-y-auto">
          <div className="grid grid-cols-2 gap-1">
            {Object.entries(FAQ_TOPICS).slice(0, 4).map(([key, label]) => (
              <button
                key={key}
                onClick={() => handleCategorySelect(key)}
                className="px-2 py-1 text-xs bg-orange-50 border border-orange-200 text-orange-700 rounded hover:bg-orange-100 transition-colors"
              >
                {label.split(' ')[0]}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="flex gap-2 p-3 border-t border-gray-200 bg-white">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
          placeholder="Ask..."
          className="flex-1 px-2 py-2 text-xs border border-gray-300 rounded focus:outline-none focus:border-orange-500"
        />
        <button
          onClick={handleSendMessage}
          disabled={!input.trim() || isLoading}
          className="px-3 py-2 text-xs bg-orange-500 text-white rounded hover:bg-orange-600 disabled:opacity-50 transition-colors"
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default HanaLeftSidebar;
