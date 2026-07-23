import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

/**
 * The page a candidate lands on from their screening link.
 *
 * Deliberately unauthenticated and outside the app shell: a candidate has no
 * account and should not see the product's navigation. The token in the URL is
 * the only credential, so nothing here accepts an invite id or a job id, and
 * the server never sends back the question weightings or expected answers.
 */

interface Question {
  id: number;
  category: string;
  question: string;
  question_type: 'text' | 'multiple-choice' | 'scale' | 'ranking';
  options?: string[] | null;
}

const API = '/api/candidate-screening';

const CandidateScreening: React.FC = () => {
  const { token } = useParams<{ token: string }>();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [intro, setIntro] = useState<{ candidate_name: string; job_title: string; department: string } | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${API}/${token}`);
        const body = await res.json();
        if (!res.ok) throw new Error(body?.error || 'This screening link is not valid');

        setIntro({
          candidate_name: body.data.candidate_name,
          job_title: body.data.job_title,
          department: body.data.department,
        });
        setQuestions(body.data.questions || []);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token]);

  const handleSubmit = async () => {
    const unanswered = questions.filter(q => !answers[q.id]?.trim());
    if (unanswered.length > 0) {
      setError(`Please answer all ${questions.length} questions before submitting.`);
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      const res = await fetch(`${API}/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answers: questions.map(q => ({ question_id: q.id, answer: answers[q.id] })),
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error || 'Could not submit your answers');
      setSubmitted(true);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const shell = (children: React.ReactNode) => (
    <div style={{ minHeight: '100vh', background: '#FAFAFA', padding: '24px' }}>
      <div style={{ maxWidth: '680px', margin: '0 auto' }}>{children}</div>
    </div>
  );

  if (loading) return shell(<p style={{ color: '#666' }}>Loading…</p>);

  if (error && !intro) {
    return shell(
      <div style={{ padding: '24px', background: 'white', border: '2px solid #F44336', borderRadius: '8px' }}>
        <h1 style={{ fontSize: '20px', color: '#C62828', margin: '0 0 8px 0' }}>Screening unavailable</h1>
        <p style={{ fontSize: '14px', color: '#333', margin: 0 }}>{error}</p>
      </div>
    );
  }

  if (submitted) {
    return shell(
      <div style={{ padding: '24px', background: 'white', border: '2px solid #4CAF50', borderRadius: '8px' }}>
        <h1 style={{ fontSize: '20px', color: '#2E7D32', margin: '0 0 8px 0' }}>Thank you</h1>
        <p style={{ fontSize: '14px', color: '#333', margin: 0 }}>
          Your answers have been submitted. The hiring team will be in touch.
        </p>
      </div>
    );
  }

  return shell(
    <>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#333', margin: '0 0 4px 0' }}>
          {intro?.job_title}
        </h1>
        <p style={{ fontSize: '14px', color: '#666', margin: 0 }}>
          {intro?.department ? `${intro.department} — ` : ''}Screening questions for {intro?.candidate_name}
        </p>
      </div>

      {error && (
        <div style={{ padding: '12px', background: '#FFEBEE', borderRadius: '6px', marginBottom: '16px', fontSize: '13px', color: '#C62828' }}>
          {error}
        </div>
      )}

      {questions.map((q, idx) => (
        <div key={q.id} style={{ padding: '16px', background: 'white', border: '1px solid #ddd', borderRadius: '8px', marginBottom: '12px' }}>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#333', marginBottom: '10px' }}>
            {idx + 1}. {q.question}
          </label>

          {q.question_type === 'multiple-choice' && Array.isArray(q.options) ? (
            <div style={{ display: 'grid', gap: '6px' }}>
              {q.options.map(opt => (
                <label key={opt} style={{ fontSize: '13px', color: '#333', display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="radio"
                    name={`q${q.id}`}
                    value={opt}
                    checked={answers[q.id] === opt}
                    onChange={e => setAnswers({ ...answers, [q.id]: e.target.value })}
                  />
                  {opt}
                </label>
              ))}
            </div>
          ) : q.question_type === 'scale' ? (
            <div style={{ display: 'flex', gap: '8px' }}>
              {[1, 2, 3, 4, 5].map(n => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setAnswers({ ...answers, [q.id]: String(n) })}
                  style={{
                    flex: 1,
                    padding: '10px',
                    background: answers[q.id] === String(n) ? '#FF6B35' : '#f0f0f0',
                    color: answers[q.id] === String(n) ? 'white' : '#333',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  {n}
                </button>
              ))}
            </div>
          ) : (
            <textarea
              value={answers[q.id] || ''}
              onChange={e => setAnswers({ ...answers, [q.id]: e.target.value })}
              style={{
                width: '100%',
                minHeight: '90px',
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '13px',
                fontFamily: 'inherit',
                boxSizing: 'border-box',
                resize: 'vertical',
              }}
            />
          )}
        </div>
      ))}

      <button
        onClick={handleSubmit}
        disabled={submitting}
        style={{
          width: '100%',
          padding: '14px',
          background: submitting ? '#FFB59B' : '#FF6B35',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          fontSize: '15px',
          fontWeight: 700,
          cursor: submitting ? 'default' : 'pointer',
          marginTop: '8px',
        }}
      >
        {submitting ? 'Submitting…' : 'Submit answers'}
      </button>

      <p style={{ fontSize: '11px', color: '#999', marginTop: '12px', textAlign: 'center' }}>
        Your answers can only be submitted once.
      </p>
    </>
  );
};

export default CandidateScreening;
