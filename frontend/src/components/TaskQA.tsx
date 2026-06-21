import { useState, useEffect } from 'react';
import axios from 'axios';

interface Question {
  id: number;
  errand_id: number;
  doer_id: number;
  doer_name: string;
  question: string;
  asker_reply?: string;
  asker_reply_at?: string;
  created_at: string;
}

interface TaskQAProps {
  errandId: number;
  isAsker: boolean;
  userRole?: 'asker' | 'doer';
  errandStatus?: string;
}

export default function TaskQA({ errandId, isAsker, userRole = 'doer', errandStatus = 'open' }: TaskQAProps) {
  const isQAClosed = errandStatus !== 'open';
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [newQuestion, setNewQuestion] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replyingSubmitting, setReplyingSubmitting] = useState(false);

  useEffect(() => {
    fetchQuestions();
  }, [errandId]);

  const fetchQuestions = async () => {
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/questions/${errandId}`
      );
      setQuestions(response.data.data || []);
      setError('');
    } catch (err: any) {
      console.error('Failed to fetch questions:', err);
      setError('');
    } finally {
      setLoading(false);
    }
  };

  const handleAskQuestion = async () => {
    if (!newQuestion.trim()) {
      return;
    }

    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/questions`,
        { errandId, question: newQuestion },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setQuestions([response.data.data, ...questions]);
      setNewQuestion('');
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to post question');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReplyToQuestion = async (questionId: number) => {
    if (!replyText.trim()) {
      return;
    }

    setReplyingSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/questions/${questionId}/reply`,
        { reply: replyText },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Refresh questions
      await fetchQuestions();
      setReplyingTo(null);
      setReplyText('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to reply');
    } finally {
      setReplyingSubmitting(false);
    }
  };

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-6 mb-6 ${isQAClosed ? 'opacity-60 bg-gray-50' : ''}`}>
      <h2 className="text-lg font-bold text-errandify-brown mb-4 flex items-center gap-2">
        <span>❓ Questions About This Task</span>
        {questions.length > 0 && (
          <span className="text-sm font-normal text-gray-600">({questions.length})</span>
        )}
        {isQAClosed && (
          <span className="text-xs font-semibold text-gray-600 bg-gray-200 px-2 py-1 rounded ml-auto">
            Closed - Use Chat
          </span>
        )}
      </h2>

      {/* Ask Question Section (for doers only, only when open) */}
      {userRole === 'doer' && !isAsker && !isQAClosed && (
        <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm font-semibold text-gray-800 mb-2">
            💡 Have a question? Ask here and others can see the answer
          </p>
          <textarea
            value={newQuestion}
            onChange={(e) => setNewQuestion(e.target.value)}
            placeholder="Ask a clarifying question about this task..."
            className="w-full p-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-errandify-orange focus:border-transparent resize-none"
            rows={3}
            disabled={submitting}
          />
          <button
            onClick={handleAskQuestion}
            disabled={submitting || !newQuestion.trim()}
            className="mt-2 px-4 py-2 bg-errandify-orange text-white rounded-lg font-semibold text-sm hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Posting...' : 'Post Question'}
          </button>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm mb-4">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-gray-600 text-sm">Loading questions...</p>
      ) : questions.length === 0 ? (
        <p className="text-gray-600 text-sm italic">No questions yet. Be the first to ask!</p>
      ) : (
        <div className="space-y-4">
          {questions.map((q) => (
            <div key={q.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              {/* Question */}
              <div className="mb-3">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-xs font-semibold text-gray-600 uppercase">
                      ❓ {q.doer_name}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {new Date(q.created_at).toLocaleDateString()} {new Date(q.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
                <p className="text-sm text-gray-800 bg-white p-3 rounded border border-gray-200">
                  {q.question}
                </p>
              </div>

              {/* Reply */}
              {q.asker_reply ? (
                <div className="bg-white p-3 rounded border-l-4 border-errandify-orange">
                  <p className="text-xs font-semibold text-errandify-orange mb-1">✅ Asker's Answer</p>
                  <p className="text-sm text-gray-800">{q.asker_reply}</p>
                  <p className="text-xs text-gray-500 mt-2">
                    {new Date(q.asker_reply_at!).toLocaleDateString()}
                  </p>
                </div>
              ) : isAsker ? (
                <div>
                  {replyingTo === q.id ? (
                    <div className="space-y-2">
                      <textarea
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="Type your answer..."
                        className="w-full p-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-errandify-orange focus:border-transparent resize-none"
                        rows={2}
                        disabled={replyingSubmitting}
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleReplyToQuestion(q.id)}
                          disabled={replyingSubmitting || !replyText.trim()}
                          className="px-3 py-1 bg-errandify-orange text-white rounded text-sm font-semibold hover:bg-opacity-90 disabled:opacity-50"
                        >
                          {replyingSubmitting ? 'Replying...' : 'Reply'}
                        </button>
                        <button
                          onClick={() => {
                            setReplyingTo(null);
                            setReplyText('');
                          }}
                          className="px-3 py-1 border border-gray-300 text-gray-700 rounded text-sm hover:bg-gray-100"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setReplyingTo(q.id)}
                      className="text-sm text-errandify-orange font-semibold hover:underline"
                    >
                      ✏️ Reply to this question
                    </button>
                  )}
                </div>
              ) : (
                <p className="text-xs text-gray-500 italic">Waiting for asker's answer...</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
