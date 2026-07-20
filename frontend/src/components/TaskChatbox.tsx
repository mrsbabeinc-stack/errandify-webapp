import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { formatErrandId } from '../utils/formatId';
import { validateMessage, validateImage, validateAudio, validateFileUpload, moderateWithAI } from '../utils/messageValidator';
import { addNotification } from '../utils/notificationStore';
import { speechService } from '../services/speechService';
import { formatCurrency } from '../utils/format';

interface Message {
  id: number;
  taskId: number;
  senderId: number;
  senderName: string;
  senderAvatar?: string;
  content: string;
  flagged: boolean;
  createdAt: string;
}

interface TaskChatboxProps {
  taskId: number;
  taskTitle: string;
  isOpen: boolean;
  onClose: () => void;
  errandDetails?: {
    budget?: number;
    deadline?: string;
    location?: string;
    postal_code?: string;
    description?: string;
  };
}

export default function TaskChatbox({
  taskId,
  taskTitle,
  isOpen,
  onClose,
  errandDetails,
}: TaskChatboxProps) {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [otherUserOnline, setOtherUserOnline] = useState<boolean | null>(null);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [askerId, setAskerId] = useState<number | null>(null);
  const [doerId, setDoerId] = useState<number | null>(null);
  const [askerName, setAskerName] = useState<string>('Asker');
  const [doerName, setDoerName] = useState<string>('Doer');
  const [askerAlias, setAskerAlias] = useState<string>('Asker');
  const [doerAlias, setDoerAlias] = useState<string>('Doer');
  const [errandFormattedId, setErrandFormattedId] = useState<string>('');
  const [apiErrandDetails, setApiErrandDetails] = useState<any | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [showImageMenu, setShowImageMenu] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [validationWarnings, setValidationWarnings] = useState<string[]>([]);
  const [validationSuggestions, setValidationSuggestions] = useState<string[]>([]);
  const [blockReason, setBlockReason] = useState<string>('');
  const [chatDisabled, setChatDisabled] = useState(false);
  const [chatDisabledReason, setChatDisabledReason] = useState('');
  const [isFavorited, setIsFavorited] = useState(false);
  const [playingMessageId, setPlayingMessageId] = useState<number | null>(null);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    if (isOpen) {
      fetchMessages();
      // Poll for new messages every 2 seconds
      const interval = setInterval(fetchMessages, 2000);
      return () => clearInterval(interval);
    }
  }, [isOpen, taskId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchMessages = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/messages/tasks/${taskId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const messagesData = response.data.data.messages || response.data.data;
      console.log('Messages fetched:', messagesData);
      setMessages(messagesData);

      // Check chat status (dispute, completion time, etc.)
      if (response.data.data.chatStatus) {
        const { isDisabled, reason, isFavorited: favStatus } = response.data.data.chatStatus;
        setChatDisabled(isDisabled);
        setChatDisabledReason(reason || '');
        setIsFavorited(favStatus || false);
      }

      // Update online status and user IDs if available
      if (response.data.data.participantStatus) {
        const currentUser = localStorage.getItem('user');
        if (currentUser) {
          const user = JSON.parse(currentUser);
          const status = response.data.data.participantStatus;
          setCurrentUserId(user.id);
          setAskerId(status.askerId);
          setDoerId(status.doerId);
          setAskerName(status.askerName || 'Asker');
          setDoerName(status.doerName || 'Doer');
          setAskerAlias(status.askerAlias || status.askerName || 'Asker');
          setDoerAlias(status.doerAlias || status.doerName || 'Doer');
          const isAsker = user.id === status.askerId;
          const onlineStatus = isAsker
            ? status.doerOnline
            : status.askerOnline;
          setOtherUserOnline(onlineStatus);
        }
      }

      // Set errand details from API (includes full postal code)
      if (response.data.data.errandDetails) {
        const apiDetails = response.data.data.errandDetails;
        console.log('[TaskChatbox] API Errand Details:', apiDetails);
        console.log('[TaskChatbox] Location:', apiDetails.location);
        console.log('[TaskChatbox] Postal Code:', apiDetails.postal_code);
        setErrandFormattedId(formatErrandId(apiDetails));
        setApiErrandDetails(apiDetails);
      }
    } catch (err: any) {
      console.error('Failed to fetch messages:', err);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    // Message is required (image is optional)
    if (!newMessage.trim()) {
      return;
    }

    // Check if chat is disabled
    if (chatDisabled) {
      setError(`❌ Chat is closed. ${chatDisabledReason}`);
      setValidationErrors([`Chat is no longer available. ${chatDisabledReason}`]);
      return;
    }

    // Validate message only if there is text
    if (newMessage.trim()) {
      // First: Quick pattern validation (contact info + drugs/violence/scams)
      const validation = validateMessage(newMessage);

      // Log for debugging
      console.log('Message:', newMessage);
      console.log('Validation result:', validation);

      setValidationErrors(validation.errors);
      setValidationWarnings(validation.warnings);
      setValidationSuggestions(validation.suggestions);

      // If pattern check found ERRORS, block immediately
      if (!validation.isValid) {
        console.log('Message BLOCKED by pattern validation');
        const friendlyMessage = `⚠️ Message Not Appropriate

Your message doesn't meet our community standards. Please keep messages:
• Task-focused and professional
• Respectful and appropriate
• Free of illegal/harmful references

📝 Try rephrasing to discuss the task instead.`;

        setValidationErrors([friendlyMessage]);
        setError('Message contains prohibited content');
        setBlockReason('Detected inappropriate content');
        return;
      }
    }

    setIsLoading(true);
    setError('');
    setBlockReason('');

    try {
      // AI moderation only for text messages
      if (newMessage.trim()) {
        // Second: AI-based content moderation (for context-dependent issues)
        const aiModeration = await moderateWithAI(newMessage);
        console.log('AI moderation result:', aiModeration);

        if (!aiModeration.isAppropriate) {
          console.log('Message BLOCKED by AI moderation');
          const friendlyMessage = `⚠️ Message Not Appropriate

Your message doesn't meet our community standards. Please keep messages:
• Task-focused and professional
• Respectful and appropriate
• Free of personal/romantic advances

📝 Try rephrasing to discuss the task instead.`;

          setBlockReason(aiModeration.reason || 'Message content not appropriate for this platform');
          setValidationErrors([friendlyMessage]);
          setError('Message blocked');
          setIsLoading(false);
          return;
        }
      }

      // Third: Send message if all checks pass
      console.log('Message APPROVED - sending...');
      const token = localStorage.getItem('token');

      let messageContent = newMessage;
      if (selectedImage) {
        // Append image info to message
        messageContent = `${newMessage}\n📎 [Image attached: ${selectedImage.name}]`;
      }

      await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/messages/tasks/${taskId}/send`,
        { content: messageContent },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      console.log('Message sent successfully');
      clearImageSelection();

      setNewMessage('');
      setValidationErrors([]);
      setValidationWarnings([]);
      setValidationSuggestions([]);
      setBlockReason('');
      setError('');
      // Wait a moment for DB to write, then fetch messages
      setTimeout(fetchMessages, 300);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to send message');
    } finally {
      setIsLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate image
    const imageValidation = validateImage(file);
    const fileValidation = validateFileUpload(file);

    if (!imageValidation.isValid || !fileValidation.isValid) {
      const allErrors = [...imageValidation.errors, ...fileValidation.errors];
      setError(allErrors.join(' '));
      return;
    }

    if (imageValidation.warnings.length > 0 || fileValidation.warnings.length > 0) {
      const allWarnings = [...imageValidation.warnings, ...fileValidation.warnings];
      setValidationWarnings(allWarnings);
    }

    if (file.type.startsWith('image/')) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearImageSelection = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
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
      setRecordingTime(0);

      const timer = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);

      mediaRecorder.onstop = () => {
        clearInterval(timer);
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const audioUrl = URL.createObjectURL(audioBlob);
        setNewMessage(`[Audio: ${audioUrl}]`);
        stream.getTracks().forEach((track) => track.stop());
      };
    } catch (err) {
      console.error('Error accessing microphone:', err);
      setError('Unable to access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleFavorite = async () => {
    try {
      const token = localStorage.getItem('token');
      const otherUserId = currentUserId === askerId ? doerId : askerId;

      if (!otherUserId) {
        setError('Could not determine the other participant');
        return;
      }

      const response = await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/users/favorite/${otherUserId}`,
        { taskId },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      console.log('Favorite response:', response.data);

      // Toggle the favorite state
      setIsFavorited(response.data.favorited);

      // Show success message
      const message = response.data.favorited ? '❤️ Added to favorites!' : '🤍 Removed from favorites';
      addNotification({
        type: 'success',
        title: 'Favorite Updated',
        message: message,
      });
    } catch (err: any) {
      console.error('Failed to update favorite:', err);
      setError(err.response?.data?.error || 'Failed to update favorite');
    }
  };

  const handlePlayAudio = async (message: Message) => {
    try {
      setIsGeneratingAudio(true);
      setPlayingMessageId(message.id);
      console.log('[Audio] Generating speech for message:', message.content.substring(0, 50));

      // Generate audio from message text
      const audioUrl = await speechService.synthesize(message.content);

      // Play the audio
      await speechService.playAudio(audioUrl);

      console.log('[Audio] Playback completed');
    } catch (err: any) {
      console.error('[Audio] Playback error:', err);
      setError('Failed to generate audio');
    } finally {
      setIsGeneratingAudio(false);
      setPlayingMessageId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end z-50 md:items-center md:justify-center">
      <div className="bg-white rounded-t-lg md:rounded-lg w-full md:max-w-6xl md:h-screen md:max-h-[85vh] flex flex-col max-h-[95vh] shadow-2xl overflow-hidden">
        {/* Header - Full Width */}
        <div style={{background: 'linear-gradient(135deg, #FF6B35 0%, #FF8A5B 100%)', color: 'white', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', boxShadow: '0 2px 8px rgba(255, 107, 53, 0.2)'}}>
          <div style={{flex: 1}}>
            <h3 style={{fontWeight: 'bold', fontSize: '15px', margin: '0 0 4px 0', color: 'white'}}>💬 {taskTitle}</h3>
            <p style={{fontSize: '12px', color: 'rgba(255, 255, 255, 0.9)', margin: 0}}>ID: {errandFormattedId}</p>
          </div>
          <button
            onClick={onClose}
            style={{background: 'none', border: 'none', color: 'white', fontSize: '24px', cursor: 'pointer', opacity: 0.9, transition: 'opacity 0.2s', flexShrink: 0}}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '0.9'}
          >
            ✕
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Chat Column */}
          <div className="flex-1 flex flex-col">

        {/* Chat Disabled Banner */}
        {chatDisabled && (
          <div className="sticky top-0 z-20 bg-gradient-to-r from-red-500 to-orange-500 text-white p-4 rounded-b-lg shadow-lg">
            <div className="flex items-start gap-3">
              <span className="text-2xl flex-shrink-0">⛔</span>
              <div className="flex-1">
                <p className="font-bold text-sm mb-1">
                  {chatDisabledReason.includes('dispute')
                    ? '⚖️ Dispute Active - Chat Disabled'
                    : '⏰ Chat Window Closed'}
                </p>
                <p className="text-xs leading-relaxed mb-2">
                  {chatDisabledReason.includes('dispute')
                    ? 'A dispute has been opened for this task. Both parties should not communicate here. Submit evidence or responses through the dispute resolution system instead. This helps ensure fair review.'
                    : 'The 48-hour chat window has closed. Any disputes must be raised immediately through the dispute system.'}
                </p>
                <button
                  onClick={() => navigate(`/disputes?errand=${taskId}`)}
                  className="text-xs bg-white/20 hover:bg-white/30 px-3 py-1 rounded-md transition font-semibold"
                >
                  Go to Dispute →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1.5 bg-gradient-to-b from-orange-50 to-orange-100">
          {messages.length === 0 ? (
            <div className="text-center text-gray-500 text-sm py-8">
              <p>💬 No messages yet</p>
              <p className="text-xs mt-1">Start a conversation to coordinate!</p>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-1.5 ${
                  msg.flagged ? 'opacity-60' : ''
                }`}
              >
                {msg.senderAvatar ? (
                  <img
                    src={msg.senderAvatar}
                    alt={msg.senderName}
                    className="w-8 h-8 rounded-full flex-shrink-0 object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full flex-shrink-0 bg-gradient-to-br from-blue-300 to-purple-400 flex items-center justify-center text-sm font-bold text-white">
                    🎨
                  </div>
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="text-xs font-semibold text-gray-900">
                      {msg.senderId === askerId ? askerName : doerName}
                    </p>
                    <span className={`text-xs px-1 py-0.5 rounded text-[11px] ${
                      msg.senderId === askerId
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-green-100 text-green-700'
                    }`}>
                      {msg.senderId === askerId ? 'Asker' : 'Doer'}
                    </span>
                    <p className="text-xs text-gray-500">
                      {new Date(msg.createdAt).toLocaleDateString('en-SG')} {new Date(msg.createdAt).toLocaleTimeString('en-SG', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                  <div
                    className={`text-xs py-1.5 px-2.5 rounded-lg inline-block max-w-xs ${
                      msg.flagged
                        ? 'bg-yellow-100 text-yellow-900 border border-yellow-200'
                        : msg.senderId === askerId
                        ? 'bg-orange-50 border border-orange-200'
                        : 'bg-green-50 border border-green-200'
                    }`}
                  >
                    {msg.flagged ? (
                      <>
                        <p className="font-semibold">⚠️ Message flagged</p>
                        <p className="text-xs mt-1">
                          This message was reviewed for community safety.
                        </p>
                      </>
                    ) : (
                      msg.content
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Validation Messages - Prominent Display */}
        {(validationErrors.length > 0 || validationWarnings.length > 0 || validationSuggestions.length > 0) && (
          <div className={`px-4 py-4 border-t border-orange-200 space-y-2 text-sm rounded-t-lg ${
            validationErrors.length > 0
              ? 'bg-gradient-to-r from-red-50 to-orange-50 border-l-4 border-l-red-500'
              : 'bg-amber-50 border-l-4 border-l-amber-500'
          }`}>
            {validationErrors.map((err, i) => (
              <div key={i}>
                {err.includes('Message Not Appropriate') ? (
                  <div className="whitespace-pre-wrap text-red-700 text-xs leading-relaxed">
                    {err}
                  </div>
                ) : (
                  <p className="text-red-700 font-semibold">{err}</p>
                )}
              </div>
            ))}
            {validationWarnings.map((warn, i) => (
              <p key={i} className="text-amber-700">{warn}</p>
            ))}
            {validationSuggestions.map((sug, i) => (
              <p key={i} className="text-blue-700">{sug}</p>
            ))}
            {blockReason && (
              <p className="text-xs text-gray-600 italic border-t border-red-200 pt-2 mt-2">
                🔍 Reason: {blockReason}
              </p>
            )}
          </div>
        )}

        {/* Input Area */}
        <form
          onSubmit={handleSendMessage}
          className="border-t border-orange-200 p-3 bg-white space-y-2"
        >
          {error && (
            <p className="text-red-600 text-xs mb-2">{error}</p>
          )}

          {/* Image Preview */}
          {imagePreview && (
            <div className="relative w-20 h-20">
              <img
                src={imagePreview}
                alt="Preview"
                className="w-full h-full object-cover rounded-lg border border-gray-300"
              />
              <button
                type="button"
                onClick={clearImageSelection}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold hover:bg-red-600"
              >
                ✕
              </button>
            </div>
          )}

          {/* Input Controls */}
          <div className="flex gap-2 items-end">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder={chatDisabled ? "Chat is closed" : "Type a message..."}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-errandify-orange disabled:bg-gray-100"
              disabled={isLoading || chatDisabled}
            />
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowImageMenu(!showImageMenu)}
                className="px-2 py-2 text-gray-500 hover:text-errandify-orange transition text-lg"
                title="Attach image"
                disabled={isLoading || isRecording}
              >
                📎
              </button>
              {showImageMenu && (
                <div className="absolute bottom-full mb-2 right-0 bg-white border border-orange-200 rounded-lg shadow-lg z-50 min-w-40">
                  <button
                    type="button"
                    onClick={() => {
                      fileInputRef.current?.click();
                      setShowImageMenu(false);
                    }}
                    className="w-full px-4 py-3 text-left text-sm hover:bg-orange-50 border-b border-orange-100 transition flex items-center gap-3 font-medium"
                  >
                    <span className="text-lg">📁</span>
                    <span>From Gallery</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      cameraInputRef.current?.click();
                      setShowImageMenu(false);
                    }}
                    className="w-full px-4 py-3 text-left text-sm hover:bg-orange-50 transition flex items-center gap-3 font-medium"
                  >
                    <span className="text-lg">📸</span>
                    <span>From Camera</span>
                  </button>
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={isRecording ? stopRecording : startRecording}
              className={`px-2 py-2 transition text-lg ${
                isRecording
                  ? 'text-red-500 hover:text-red-700 animate-pulse'
                  : 'text-gray-500 hover:text-errandify-orange'
              }`}
              title={isRecording ? 'Stop recording' : 'Start voice recording'}
              disabled={isLoading}
            >
              {isRecording ? '⏹️' : '🎙️'}
            </button>
            {isRecording && (
              <span className="text-xs text-red-500 font-semibold">
                {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}
              </span>
            )}
            <button
              type="submit"
              disabled={isLoading || !newMessage.trim()}
              className="px-3 py-2 bg-errandify-orange text-white rounded-lg text-sm font-semibold hover:bg-opacity-90 disabled:opacity-50"
              title={selectedImage ? '📎 File attached' : 'Send message'}
            >
              {isLoading ? '⏳' : (selectedImage ? '📎 →' : '→')}
            </button>
          </div>

          {/* Hidden file inputs */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageSelect}
            className="hidden"
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleImageSelect}
            className="hidden"
          />

        </form>
          </div>

          {/* Right Sidebar - Errand Details */}
          {errandDetails && (
            <div className="w-80 flex flex-col border-l border-orange-200 bg-orange-50 p-4 overflow-hidden">
              {/* Participants - Show other person first based on current user role */}
              <div className="mb-4 pb-4 border-b border-orange-200">
                {/* Show the OTHER person prominently */}
                {currentUserId === askerId ? (
                  // Current user is ASKER - show Doer first
                  <>
                    <div className="flex items-center gap-2 justify-between mb-3 p-2 bg-green-50 rounded-lg border border-green-200">
                      <div className="flex items-center gap-2 flex-1">
                        <div className="relative w-8 h-8 rounded-full bg-green-300 flex items-center justify-center flex-shrink-0 text-xs font-bold">
                          D
                          {otherUserOnline !== null && (
                            <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${otherUserOnline ? 'bg-green-500' : 'bg-gray-400'}`} title={otherUserOnline ? 'Online' : 'Offline'} />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="text-xs text-green-700 font-semibold">Your Doer</p>
                          <div className="flex items-center gap-1">
                            <p className="text-sm text-gray-900 font-bold">{doerName || 'Doer'}</p>
                            {otherUserOnline !== null && (
                              <span className="text-xs text-gray-500">
                                {otherUserOnline ? '🟢 Online' : '⚪ Offline'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={handleFavorite}
                        className={`text-lg transition ${isFavorited ? 'text-red-500' : 'text-gray-300 hover:text-red-400'}`}
                        title={isFavorited ? 'Remove favorite' : 'Add favorite'}
                      >
                        {isFavorited ? '❤️' : '🤍'}
                      </button>
                    </div>
                    <div className="flex items-center gap-2 justify-between text-xs text-gray-600">
                      <span>📌 You (Asker)</span>
                      <span>{askerName || 'Asker'}</span>
                    </div>
                  </>
                ) : (
                  // Current user is DOER - show Asker first
                  <>
                    <div className="flex items-center gap-2 justify-between mb-3 p-2 bg-orange-50 rounded-lg border border-orange-200">
                      <div className="flex items-center gap-2 flex-1">
                        <div className="relative w-8 h-8 rounded-full bg-blue-300 flex items-center justify-center flex-shrink-0 text-xs font-bold">
                          A
                          {otherUserOnline !== null && (
                            <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${otherUserOnline ? 'bg-green-500' : 'bg-gray-400'}`} title={otherUserOnline ? 'Online' : 'Offline'} />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="text-xs text-blue-700 font-semibold">Your Asker</p>
                          <div className="flex items-center gap-1">
                            <p className="text-sm text-gray-900 font-bold">{askerName || 'Asker'}</p>
                            {otherUserOnline !== null && (
                              <span className="text-xs text-gray-500">
                                {otherUserOnline ? '🟢 Online' : '⚪ Offline'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={handleFavorite}
                        className={`text-lg transition ${isFavorited ? 'text-red-500' : 'text-gray-300 hover:text-red-400'}`}
                        title={isFavorited ? 'Remove favorite' : 'Add favorite'}
                      >
                        {isFavorited ? '❤️' : '🤍'}
                      </button>
                    </div>
                  </>
                )}
              </div>

              <h4 className="text-sm text-gray-800 mb-4">📋 Errand Details</h4>

              <div className="space-y-3 text-xs">
                {/* Budget */}
                <div>
                  <p className="text-xs text-gray-500">💰 Budget</p>
                  <p className="text-xs text-errandify-orange font-semibold">
                    {(apiErrandDetails?.budget || errandDetails?.budget) ? formatCurrency(apiErrandDetails?.budget || errandDetails?.budget) : 'Not specified'}
                  </p>
                </div>

                {/* Location */}
                <div>
                  <p className="text-xs text-gray-500">📍 Location</p>
                  <p className="text-xs text-gray-700 font-semibold break-words">
                    {apiErrandDetails?.location || errandDetails?.location || 'Not specified'}
                  </p>
                </div>

                {/* Date & Time */}
                <div>
                  <p className="text-xs text-gray-500">🕐 Date & Time</p>
                  {(apiErrandDetails?.deadline || errandDetails?.deadline) ? (
                    <>
                      <p className="text-xs text-gray-700">
                        {new Date(apiErrandDetails?.deadline || errandDetails?.deadline || '').toLocaleDateString('en-SG')}
                      </p>
                      <p className="text-xs text-gray-700">
                        {new Date(apiErrandDetails?.deadline || errandDetails?.deadline || '').toLocaleTimeString('en-SG', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </>
                  ) : (
                    <p className="text-xs text-gray-600">Not specified</p>
                  )}
                </div>

                {/* Description */}
                <div className="border-t pt-3">
                  <p className="text-xs text-gray-500">📝 Description</p>
                  <p className="text-xs text-gray-700 leading-relaxed line-clamp-6">
                    {apiErrandDetails?.description || errandDetails?.description || 'No description provided'}
                  </p>
                </div>
              </div>

              {/* Action Button */}
              <button
                onClick={() => {
                  console.log('[TaskChatbox] Clicked View & Update Status, navigating to:', taskId);
                  onClose();
                  navigate(`/errand/${taskId}`);
                }}
                className="mt-6 w-full py-2 bg-errandify-orange text-white rounded-lg text-sm font-semibold hover:bg-opacity-90 transition-colors cursor-pointer"
              >
                📌 View & Update Status
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
