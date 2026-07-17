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

type MessageLanguage = 'en' | 'zh';

const Hana: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
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
      en: "👋 Hi! I'm Hana, your Errandify assistant. I can help you with FAQs, answer questions about your ongoing errands, or guide you through any process. What can I help you with today?",
      zh: "👋 你好！我是帮帮乐助手Hana。我可以帮助你了解常见问题、回答关于你正在进行的任务的问题，或指导你完成任何流程。今天有什么我可以帮助你的吗？",
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
        ? "You don't have any active errands right now. Want to post one?"
        : "你现在没有任何活跃的任务。想发布一个吗？";
    }

    const activeErrands = userErrands.filter(e =>
      e.status !== 'completed' && e.status !== 'cancelled'
    );

    if (activeErrands.length === 0) {
      return language === 'en'
        ? "All your errands are completed or cancelled!"
        : "你的所有任务都已完成或取消！";
    }

    const summary = activeErrands.map((e, idx) => {
      const status = language === 'en'
        ? e.status
        : getStatusChinese(e.status);
      return `${idx + 1}. "${e.title}" - ${status}`;
    }).join('\n');

    return language === 'en'
      ? `You have ${activeErrands.length} active errand(s):\n\n${summary}\n\nWould you like help with any of these?`
      : `你有${activeErrands.length}个活跃的任务：\n\n${summary}\n\n你需要帮助吗？`;
  };

  const getStatusChinese = (status: string): string => {
    const map: Record<string, string> = {
      'posted': '已发布',
      'bidding': '竞价中',
      'accepted': '已接受',
      'in-progress': '进行中',
      'completed': '已完成',
      'cancelled': '已取消',
      'disputed': '有争议',
    };
    return map[status] || status;
  };


  const handleSendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = input.trim();
    addMessage('user', userMessage);
    setInput('');
    setIsLoading(true);

    // Simulate processing delay
    setTimeout(() => {
      // Check for FAQ match
      const faqMatches = searchFAQ(userMessage);

      if (faqMatches.length > 0) {
        const topMatch = faqMatches[0];
        const answer = topMatch.answer[language] || topMatch.answer.en;
        addMessage('hana', answer, 'faq');

        if (faqMatches.length > 1) {
          const followUp = language === 'en'
            ? `I found ${faqMatches.length} relevant articles. Would you like to see more?`
            : `我找到了${faqMatches.length}篇相关文章。你想看更多吗？`;
          addMessage('hana', followUp);
        }
      }
      // Check for errand-related questions
      else if (
        userMessage.toLowerCase().includes('errand') ||
        userMessage.toLowerCase().includes('task') ||
        userMessage.toLowerCase().includes('bid') ||
        userMessage.toLowerCase().includes('status') ||
        userMessage.toLowerCase().includes('任务') ||
        userMessage.toLowerCase().includes('帮帮') ||
        userMessage.toLowerCase().includes('幫幫')
      ) {
        const errandHelp = getErrandContextHelp();
        addMessage('hana', errandHelp, 'errand-context');
      }
      // Fallback response
      else {
        const fallback = language === 'en'
          ? "I'm not sure about that. Could you rephrase your question or try asking about a specific feature? I'm here to help with FAQs, errand guidance, and more."
          : "我不太确定。你能重新表述你的问题或尝试询问特定功能吗？我在这里帮助你解答常见问题、任务指导等。";
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
        ? `I found ${categoryItems.length} articles about ${categoryName}. Here are the top questions:\n\n${categoryItems.slice(0, 3).map((item, idx) => `${idx + 1}. ${item.question[language] || item.question.en}`).join('\n')}\n\nWhich one interests you?`
        : `我找到了关于${categoryName}的${categoryItems.length}篇文章。以下是最受欢迎的问题：\n\n${categoryItems.slice(0, 3).map((item, idx) => `${idx + 1}. ${item.question.zh || item.question.en}`).join('\n')}\n\n哪一个吸引你？`;

      addMessage('hana', responseText);
      setSelectedCategory(categoryId);
    }
  };

  const handleNavigate = (path: string) => {
    navigate(path);
    showToast('Navigating...', 'info');
    setIsOpen(false);
  };

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="floating-hana-button"
          style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #FF6B35 0%, #FF8A5B 100%)',
            border: 'none',
            boxShadow: '0 4px 12px rgba(255, 107, 53, 0.3)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '28px',
            zIndex: 999,
            animation: 'float 3s ease-in-out infinite',
          }}
          title="Chat with Hana"
        >
          💬
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            width: '400px',
            maxHeight: isMinimized ? '50px' : '600px',
            background: 'white',
            borderRadius: '12px',
            boxShadow: '0 5px 40px rgba(0, 0, 0, 0.16)',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            transition: 'all 0.3s ease',
          }}
        >
          {/* Header */}
          <div
            style={{
              background: 'linear-gradient(135deg, #FF6B35 0%, #FF8A5B 100%)',
              color: 'white',
              padding: '16px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              cursor: 'pointer',
            }}
            onClick={() => setIsMinimized(!isMinimized)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '20px' }}>🤖</span>
              <span style={{ fontWeight: '600' }}>Hana Assistant</span>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as MessageLanguage)}
                onClick={(e) => e.stopPropagation()}
                style={{
                  padding: '4px 8px',
                  borderRadius: '4px',
                  border: 'none',
                  background: 'rgba(255, 255, 255, 0.2)',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '12px',
                }}
              >
                <option value="en">🇬🇧 EN</option>
                <option value="zh">🇨🇳 中文</option>
              </select>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsOpen(false);
                }}
                style={{
                  background: 'rgba(255, 255, 255, 0.2)',
                  border: 'none',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '16px',
                  padding: '2px 6px',
                  borderRadius: '4px',
                }}
              >
                ✕
              </button>
            </div>
          </div>

          {!isMinimized && (
            <>
              {/* Messages */}
              <div
                style={{
                  flex: 1,
                  overflowY: 'auto',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  background: '#f9f9f9',
                }}
              >
                {messages.length === 0 ? (
                  <div style={{ textAlign: 'center', color: '#999', paddingTop: '20px' }}>
                    <div style={{ fontSize: '32px', marginBottom: '8px' }}>👋</div>
                    <p>{language === 'en' ? 'Start chatting!' : language === 'zh' ? '开始聊天！' : '開始聊天！'}</p>
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      style={{
                        textAlign: msg.sender === 'user' ? 'right' : 'left',
                        marginBottom: '4px',
                      }}
                    >
                      <div
                        style={{
                          display: 'inline-block',
                          maxWidth: '85%',
                          padding: '10px 14px',
                          borderRadius: msg.sender === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                          background: msg.sender === 'user' ? '#FF6B35' : '#e8e8e8',
                          color: msg.sender === 'user' ? 'white' : '#333',
                          fontSize: '14px',
                          wordBreak: 'break-word',
                          whiteSpace: 'pre-wrap',
                        }}
                      >
                        {msg.text}
                      </div>
                    </div>
                  ))
                )}
                {isLoading && (
                  <div style={{ textAlign: 'left' }}>
                    <div
                      style={{
                        display: 'inline-block',
                        padding: '10px 14px',
                        borderRadius: '16px 16px 16px 4px',
                        background: '#e8e8e8',
                        color: '#999',
                      }}
                    >
                      ⏳ {language === 'en' ? 'Thinking...' : language === 'zh' ? '思考中...' : '思考緊...'}
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* FAQ Categories (if no category selected) */}
              {selectedCategory === null && messages.length <= 1 && (
                <div
                  style={{
                    padding: '12px',
                    background: 'white',
                    borderTop: '1px solid #eee',
                    maxHeight: '100px',
                    overflowY: 'auto',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: '6px',
                  }}
                >
                  {Object.entries(FAQ_TOPICS).slice(0, 6).map(([key, label]) => (
                    <button
                      key={key}
                      onClick={() => handleCategorySelect(key)}
                      style={{
                        padding: '8px',
                        borderRadius: '6px',
                        border: '1px solid #ddd',
                        background: 'white',
                        cursor: 'pointer',
                        fontSize: '12px',
                        color: '#333',
                        transition: 'all 0.2s',
                      }}
                      onMouseOver={(e) => {
                        (e.target as HTMLButtonElement).style.background = '#fff3e0';
                        (e.target as HTMLButtonElement).style.borderColor = '#FF6B35';
                      }}
                      onMouseOut={(e) => {
                        (e.target as HTMLButtonElement).style.background = 'white';
                        (e.target as HTMLButtonElement).style.borderColor = '#ddd';
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}

              {/* Input */}
              <div
                style={{
                  display: 'flex',
                  gap: '8px',
                  padding: '12px',
                  background: 'white',
                  borderTop: '1px solid #eee',
                }}
              >
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder={
                    language === 'en'
                      ? 'Ask me anything...'
                      : language === 'zh'
                      ? '问我任何问题...'
                      : '問我任何問題...'
                  }
                  style={{
                    flex: 1,
                    padding: '10px 12px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '14px',
                    outline: 'none',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={(e) => (e.target.style.borderColor = '#FF6B35')}
                  onBlur={(e) => (e.target.style.borderColor = '#ddd')}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!input.trim() || isLoading}
                  style={{
                    padding: '10px 16px',
                    borderRadius: '6px',
                    border: 'none',
                    background: '#FF6B35',
                    color: 'white',
                    cursor: input.trim() && !isLoading ? 'pointer' : 'not-allowed',
                    fontSize: '14px',
                    opacity: input.trim() && !isLoading ? 1 : 0.5,
                  }}
                >
                  Send
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
};

export default Hana;
