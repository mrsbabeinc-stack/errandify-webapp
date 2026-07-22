import React, { useState, useEffect } from 'react';
import { generateText, generateImages } from '../../utils/aiClient';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useToast, ToastContainer } from '../../components/Toast';
import AdminLayout from '../../components/admin/AdminLayout';

interface Recognition {
  id: string;
  userName: string;
  award: string;
  reason: string;
  icon: string;
  awardedAt: string;
  visibility: 'public' | 'private';
  awardImageUrl?: string;
  awardImageAlt?: string;
}

interface SuggestedAward {
  name: string;
  icon: string;
  description: string;
  category: 'performance' | 'community' | 'reliability' | 'excellence';
}

export default function Recognition() {
  const navigate = useNavigate();
  const { toasts, showToast, removeToast } = useToast();
  const [recognitions, setRecognitions] = useState<Recognition[]>([]);
  const [activeTab, setActiveTab] = useState<'manual' | 'ai-suggest'>('manual');

  // Manual award state
  const [newUserName, setNewUserName] = useState('');
  const [newAward, setNewAward] = useState('top-doer');
  const [newReason, setNewReason] = useState('');
  const [awardImageUrl, setAwardImageUrl] = useState('');
  const [awardImageAlt, setAwardImageAlt] = useState('');
  const [userAchievements, setUserAchievements] = useState('');
  const [generatingReason, setGeneratingReason] = useState(false);

  // AI suggestion state
  const [userMetrics, setUserMetrics] = useState('');
  const [suggestedAwards, setSuggestedAwards] = useState<SuggestedAward[]>([]);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [generatingImageFor, setGeneratingImageFor] = useState<string | null>(null);
  const [generatedAwardImages, setGeneratedAwardImages] = useState<{ [key: string]: string }>({});
  // Variants per award, so the admin can choose rather than accept the first
  const [awardImageOptions, setAwardImageOptions] = useState<Record<string, string[]>>({});

  const callQwenAPI = async (prompt: string): Promise<string> => {
    try {
      const responseText = await generateText(prompt, { maxTokens: 1500, temperature: 0.7 });
      return responseText || '';
    } catch (error) {
      console.error('Qwen API error:', error);
      return '';
    }
  };

  const handleSuggestAwards = async () => {
    if (!userMetrics.trim()) {
      showToast('⚠️ Please describe the user\'s achievements', 'error');
      return;
    }

    setSuggestLoading(true);
    const prompt = `You are an award recognition expert for a gig economy platform called Errandify. Based on this user's achievements, suggest 3-5 relevant awards they deserve.

User Achievements: "${userMetrics}"

For each award, include:
1. Award name (creative, meaningful, encouraging)
2. Icon (single emoji that represents the award)
3. Description (why they earned this award)
4. Category (performance, community, reliability, excellence)

Respond with ONLY valid JSON:
{
  "awards": [
    {
      "name": "Award Name",
      "icon": "🏆",
      "description": "Why they earned this award",
      "category": "performance"
    }
  ]
}`;

    const result = await callQwenAPI(prompt);

    if (result) {
      try {
        const parsed = JSON.parse(result);
        setSuggestedAwards(parsed.awards || []);
        showToast('✅ Awards suggested! Click to generate images.', 'success');
      } catch {
        showToast('⚠️ Failed to parse awards', 'error');
      }
    } else {
      showToast('⚠️ Failed to generate suggestions', 'error');
    }
    setSuggestLoading(false);
  };

  const handleGenerateAwardReason = async () => {
    if (!newUserName.trim() || !userAchievements.trim()) {
      showToast('⚠️ Enter user name and achievements', 'error');
      return;
    }

    setGeneratingReason(true);

    const prompt = `You are an expert at writing inspiring award recognition messages. Based on this user's achievements, write a compelling reason/description for the "${newAward}" award.

User: ${newUserName}
Achievements: ${userAchievements}
Award Type: ${newAward}

Write a concise, warm, and genuine recognition message (2-3 sentences max) that:
1. Specifically references their achievements
2. Shows genuine appreciation
3. Motivates and inspires
4. Is suitable for public celebration

Respond with ONLY the recognition message, no quotes or extra text.`;

    const result = await callQwenAPI(prompt);

    if (result) {
      setNewReason(result.trim());
      showToast('✅ Award reason generated!', 'success');
    } else {
      showToast('⚠️ Failed to generate reason', 'error');
    }
    setGeneratingReason(false);
  };

  const handleGenerateAwardImage = async (awardName: string, awardIcon: string, description: string) => {
    setGeneratingImageFor(awardName);

    const prompt = `Create a professional award/badge design image description for: "${awardName}"
Icon: ${awardIcon}
Description: ${description}

The award image should be:
- Professional certificate or badge design (1200x800px)
- Include the award name, icon, and achievement message
- Use warm, celebratory colors (golds, silvers, warm oranges)
- Show trophy, medal, star, or badge style
- Include decorative elements (ribbons, stars, laurels)
- Modern, polished, recognition-worthy appearance

Respond with ONLY a detailed visual description (2-3 sentences) of what the image looks like, as if you've already generated it.`;

    // Real generation. This asked a text model to describe an image "as if
    // you've already generated it", then showed a random Unsplash stock photo
    // and claimed "Award image generated!". Now it actually generates one.
    try {
      const images = await generateImages(
        `Award badge illustration for "${awardName}" on Errandify, a warm Singapore neighbourhood errand marketplace. Trophy or medal style with ribbons and stars, polished and celebratory, no text overlay.`,
        3,
        '1024*1024'
      );
      setAwardImageOptions({ ...awardImageOptions, [awardName]: images.map((i) => i.url) });
      setGeneratedAwardImages({ ...generatedAwardImages, [awardName]: images[0].url });
      showToast(`🎨 ${images.length} award designs ready — pick your favourite`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Could not generate the award image', 'error');
    }
    setGeneratingImageFor(null);
  };

  useEffect(() => {
    const saved = localStorage.getItem('recognitions');
    if (saved) {
      setRecognitions(JSON.parse(saved));
    } else {
      const demoRecognitions: Recognition[] = [
        {
          id: 'rec_1',
          userName: 'Alex Wong',
          award: 'Top Doer of the Month',
          reason: 'Completed 50 errands with 100% satisfaction',
          icon: '🏆',
          awardedAt: new Date(Date.now() - 86400000).toISOString(),
          visibility: 'public',
        },
        {
          id: 'rec_2',
          userName: 'Sarah Chen',
          award: 'Community Hero',
          reason: 'Helped 20 users with emergency errands',
          icon: '⭐',
          awardedAt: new Date(Date.now() - 604800000).toISOString(),
          visibility: 'public',
        },
        {
          id: 'rec_3',
          userName: 'John Lee',
          award: 'Reliable Partner',
          reason: '99% on-time completion rate',
          icon: '✓',
          awardedAt: new Date(Date.now() - 1296000000).toISOString(),
          visibility: 'private',
        },
      ];
      setRecognitions(demoRecognitions);
      localStorage.setItem('recognitions', JSON.stringify(demoRecognitions));
    }
  }, []);

  const handleCreateRecognition = () => {
    if (!newUserName.trim() || !newReason.trim()) {
      showToast('⚠️ Please fill in user name and reason', 'error');
      return;
    }

    const awardIcons: { [key: string]: string } = {
      'top-doer': '🏆',
      'community-hero': '⭐',
      'reliable': '✓',
      'helpful': '❤️',
    };

    const newRecognition: Recognition = {
      id: `rec_${Date.now()}`,
      userName: newUserName,
      award: newAward,
      reason: newReason,
      icon: awardIcons[newAward] || '🏅',
      awardedAt: new Date().toISOString(),
      visibility: 'public',
      awardImageUrl: awardImageUrl || undefined,
      awardImageAlt: awardImageAlt || undefined,
    };

    const updated = [...recognitions, newRecognition];
    setRecognitions(updated);
    localStorage.setItem('recognitions', JSON.stringify(updated));
    setNewUserName('');
    setNewReason('');
    setAwardImageUrl('');
    setAwardImageAlt('');
    showToast('✅ Recognition awarded!', 'success');
  };

  return (
    <AdminLayout>
      <div style={{ padding: '16px', background: '#fff' }}>
      <ToastContainer toasts={toasts} onClose={removeToast} />
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#333' }}>
            🏆 Recognition
          </h2>
          <button
            onClick={() => navigate(-1)}
            style={{
              fontSize: '20px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#FF6B35',
              fontWeight: '700',
              padding: '0 8px',
            }}
            title="Go back"
          >
            ←
          </button>
        </div>
        <p style={{ fontSize: '14px', color: '#666' }}>
          Recognize and celebrate user achievements
        </p>
      </div>

      {/* TAB NAVIGATION */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', borderBottom: '2px solid #FFD9B3' }}>
        <button
          onClick={() => setActiveTab('manual')}
          style={{
            padding: '12px 16px',
            background: activeTab === 'manual' ? '#FFD9B3' : 'transparent',
            color: activeTab === 'manual' ? '#333' : '#999',
            border: 'none',
            borderBottom: activeTab === 'manual' ? '3px solid #FF6B35' : 'none',
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: '14px',
            transition: 'all 0.2s',
          }}
        >
          ✍️ Manual Award
        </button>
        <button
          onClick={() => setActiveTab('ai-suggest')}
          style={{
            padding: '12px 16px',
            background: activeTab === 'ai-suggest' ? '#FFD9B3' : 'transparent',
            color: activeTab === 'ai-suggest' ? '#333' : '#999',
            border: 'none',
            borderBottom: activeTab === 'ai-suggest' ? '3px solid #FF6B35' : 'none',
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: '14px',
            transition: 'all 0.2s',
          }}
        >
          🤖 AI Suggest Awards
        </button>
      </div>

      {/* MANUAL AWARD TAB */}
      {activeTab === 'manual' && (
      <div style={{ marginBottom: '24px' }}>
        <div style={{ fontSize: '14px', fontWeight: '600', color: '#333', marginBottom: '12px' }}>
          ✍️ Award User Manually
        </div>
        <div style={{ display: 'grid', gap: '12px' }}>
          <input
            type="text"
            placeholder="User name"
            value={newUserName}
            onChange={(e) => setNewUserName(e.target.value)}
            style={{ padding: '10px 12px', border: '2px solid #FFD9B3', borderRadius: '6px', fontSize: '14px' }}
          />
          <select
            value={newAward}
            onChange={(e) => setNewAward(e.target.value)}
            style={{ padding: '10px 12px', border: '2px solid #FFD9B3', borderRadius: '6px', fontSize: '14px', cursor: 'pointer' }}
          >
            <option value="top-doer">🏆 Top Doer</option>
            <option value="community-hero">⭐ Community Hero</option>
            <option value="reliable">✓ Reliable Partner</option>
            <option value="helpful">❤️ Most Helpful</option>
            <option value="excellence">💎 Excellence Award</option>
            <option value="mvp">🌟 MVP</option>
          </select>
          {/* AI-Generated Reason Section */}
          <div style={{ padding: '12px', background: '#FFF8F5', borderRadius: '6px', border: '2px solid #FFD9B3' }}>
            <div style={{ fontSize: '12px', fontWeight: '600', color: '#333', marginBottom: '8px' }}>
              ✨ AI-Generate Award Reason (Optional)
            </div>
            <input
              type="text"
              placeholder="E.g., 'Completed 200 errands, 4.9★ rating, helped 50 emergencies, earned $10K/month'"
              value={userAchievements}
              onChange={(e) => setUserAchievements(e.target.value)}
              style={{ padding: '8px 12px', border: '2px solid #FFD9B3', borderRadius: '6px', fontSize: '13px', width: '100%', marginBottom: '8px' }}
            />
            <button
              onClick={handleGenerateAwardReason}
              disabled={generatingReason || !newUserName.trim() || !userAchievements.trim()}
              style={{
                width: '100%',
                padding: '8px',
                background: generatingReason || !newUserName.trim() || !userAchievements.trim() ? '#ccc' : '#FF6B35',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontWeight: '600',
                cursor: (generatingReason || !newUserName.trim() || !userAchievements.trim()) ? 'not-allowed' : 'pointer',
                fontSize: '12px',
              }}
            >
              {generatingReason ? '⏳ Generating...' : '🤖 Generate Reason'}
            </button>
          </div>

          <textarea
            placeholder="Reason for award (or auto-generate using achievements above)"
            value={newReason}
            onChange={(e) => setNewReason(e.target.value)}
            style={{ padding: '10px 12px', border: `2px solid ${newReason ? '#FF6B35' : '#FFD9B3'}`, borderRadius: '6px', fontSize: '14px', minHeight: '80px', fontFamily: 'system-ui' }}
          />

          {/* Award Image Section */}
          <div style={{ padding: '12px', background: '#FFF8F5', borderRadius: '6px', border: '1px solid #FFD9B3' }}>
            <div style={{ fontSize: '12px', fontWeight: '600', color: '#333', marginBottom: '8px' }}>
              🎨 Award Image (Optional)
            </div>
            <div style={{ fontSize: '11px', color: '#666', marginBottom: '8px' }}>
              Paste image URL or leave empty for default
            </div>
            <input
              type="text"
              placeholder="Award image URL (1200x800px recommended)"
              value={awardImageUrl}
              onChange={(e) => setAwardImageUrl(e.target.value)}
              style={{ padding: '8px 12px', border: '2px solid #FFD9B3', borderRadius: '6px', fontSize: '13px', width: '100%', marginBottom: '8px' }}
            />
            {awardImageUrl && (
              <div style={{ borderRadius: '4px', overflow: 'hidden', maxHeight: '200px', marginBottom: '8px' }}>
                <img src={awardImageUrl} alt="Award" style={{ width: '100%', height: 'auto' }} />
              </div>
            )}
          </div>

          <button
            onClick={handleCreateRecognition}
            style={{
              padding: '10px',
              background: 'linear-gradient(135deg, #FF6B35 0%, #FF8C5A 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            + Award Recognition
          </button>
        </div>
      </div>
      )}

      {/* AI SUGGEST AWARDS TAB */}
      {activeTab === 'ai-suggest' && (
      <div style={{ marginBottom: '24px' }}>
        <div style={{ fontSize: '14px', fontWeight: '600', color: '#333', marginBottom: '12px' }}>
          🤖 AI-Suggested Awards
        </div>
        <div style={{ display: 'grid', gap: '12px' }}>
          <div>
            <label style={{ fontSize: '12px', fontWeight: '600', color: '#333', display: 'block', marginBottom: '6px' }}>
              📊 User Achievements
            </label>
            <textarea
              placeholder="E.g., 'Completed 200 errands with 4.9★ rating, never late, helped 50 emergency requests, earned $10K/month, top 1% earner, consistent performer for 2 years'"
              value={userMetrics}
              onChange={(e) => setUserMetrics(e.target.value)}
              style={{ padding: '10px 12px', border: '2px solid #FFD9B3', borderRadius: '6px', fontSize: '14px', minHeight: '100px', fontFamily: 'system-ui', width: '100%' }}
            />
          </div>

          <button
            onClick={handleSuggestAwards}
            disabled={suggestLoading}
            style={{
              padding: '10px',
              background: suggestLoading ? '#ccc' : 'linear-gradient(135deg, #FF6B35 0%, #FF8C5A 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontWeight: '600',
              cursor: suggestLoading ? 'wait' : 'pointer',
            }}
          >
            {suggestLoading ? '⏳ Analyzing achievements...' : '🤖 Suggest Relevant Awards'}
          </button>

          {/* Suggested Awards Display */}
          {suggestedAwards.length > 0 && (
            <div style={{ marginTop: '16px' }}>
              <div style={{ fontSize: '13px', fontWeight: '600', color: '#333', marginBottom: '12px' }}>
                ✨ Suggested Awards ({suggestedAwards.length})
              </div>
              <div style={{ display: 'grid', gap: '12px' }}>
                {suggestedAwards.map((award, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: '12px',
                      background: 'white',
                      borderRadius: '6px',
                      border: '2px solid #FFD9B3',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: '600', color: '#333', marginBottom: '4px' }}>
                          {award.icon} {award.name}
                        </div>
                        <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>
                          {award.description}
                        </div>
                        <span style={{ fontSize: '10px', color: '#FF6B35', fontWeight: '600' }}>
                          {award.category.toUpperCase()}
                        </span>
                      </div>
                    </div>

                    {/* Award Image */}
                    <div style={{ marginBottom: '8px' }}>
                      {generatedAwardImages[award.name] ? (
                        <div style={{ borderRadius: '4px', overflow: 'hidden', maxHeight: '180px', marginBottom: '8px' }}>
                          <img src={generatedAwardImages[award.name]} alt={award.name} style={{ width: '100%', height: 'auto' }} />
                        </div>
                      ) : (
                        <button
                          onClick={() => handleGenerateAwardImage(award.name, award.icon, award.description)}
                          disabled={generatingImageFor === award.name}
                          style={{
                            width: '100%',
                            padding: '8px',
                            background: generatingImageFor === award.name ? '#ccc' : '#FF6B35',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            fontWeight: '600',
                            cursor: generatingImageFor === award.name ? 'wait' : 'pointer',
                            fontSize: '12px',
                          }}
                        >
                          {generatingImageFor === award.name ? '⏳ Generating image...' : '🎨 Generate Award Image'}
                        </button>
                      )}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <button
                        onClick={() => {
                          setNewUserName('');
                          setNewAward(award.name.toLowerCase().replace(/ /g, '-'));
                          setNewReason(award.description);
                          setAwardImageUrl(generatedAwardImages[award.name] || '');
                          setActiveTab('manual');
                        }}
                        style={{
                          padding: '6px',
                          background: '#4CAF50',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          fontSize: '11px',
                        }}
                      >
                        ✅ Use This Award
                      </button>
                      <button
                        onClick={() => {
                          showToast(`Added to clipboard: ${award.name}`, 'success');
                        }}
                        style={{
                          padding: '6px',
                          background: '#2196F3',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          fontSize: '11px',
                        }}
                      >
                        📋 Copy
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      )}

      {/* RECOGNITIONS LIST */}
      <div style={{ fontSize: '14px', fontWeight: '600', color: '#333', marginBottom: '16px' }}>
        🏆 Recognition History
      </div>
      <div style={{ display: 'grid', gap: '16px' }}>
        {recognitions.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', color: '#999' }}>
            No recognitions yet. Award your first user!
          </div>
        ) : (
          recognitions.map(rec => (
            <div key={rec.id} style={{
              padding: '16px',
              background: 'white',
              border: '2px solid #FFD9B3',
              borderRadius: '8px',
              overflow: 'hidden',
            }}>
              {/* Award Image */}
              {rec.awardImageUrl && (
                <div style={{ marginBottom: '12px', borderRadius: '6px', overflow: 'hidden', maxHeight: '200px' }}>
                  <img src={rec.awardImageUrl} alt={rec.awardImageAlt || rec.award} style={{ width: '100%', height: 'auto', display: 'block' }} />
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: '12px', alignItems: 'start' }}>
                <div style={{ fontSize: '28px' }}>{rec.icon}</div>
                <div>
                  <div style={{ fontWeight: '600', color: '#333', marginBottom: '4px', fontSize: '16px' }}>
                    {rec.userName}
                  </div>
                  <div style={{ fontSize: '13px', color: '#FF6B35', marginBottom: '4px', fontWeight: '600' }}>
                    {rec.award}
                  </div>
                  <div style={{ fontSize: '12px', color: '#666', marginBottom: '6px', lineHeight: '1.4' }}>
                    {rec.reason}
                  </div>
                  <div style={{ fontSize: '11px', color: '#999' }}>
                    🗓️ {new Date(rec.awardedAt).toLocaleDateString()}
                  </div>
                </div>
                <span style={{
                  padding: '6px 10px',
                  background: rec.visibility === 'public' ? '#e8f5e9' : '#f5f5f5',
                  color: rec.visibility === 'public' ? '#2e7d32' : '#999',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontWeight: '600',
                  height: 'fit-content',
                  whiteSpace: 'nowrap',
                }}>
                  {rec.visibility.toUpperCase()}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
      </div>
    </AdminLayout>
  );
}
