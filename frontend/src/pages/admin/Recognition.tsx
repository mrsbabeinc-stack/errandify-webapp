import React, { useState, useEffect } from 'react';
import { generateText, generateImages } from '../../utils/aiClient';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useToast, ToastContainer } from '../../components/Toast';
import AdminLayout from '../../components/admin/AdminLayout';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface Recognition {
  id: number;
  userId: number;
  userName: string;
  userRef?: string;
  award: string;
  reason: string;
  icon: string;
  awardedAt: string;
  visibility: 'public' | 'private';
  awardImageUrl?: string;
  awardImageAlt?: string;
  votes: number;
}

/** A real account, found by search. Awards attach to this, not to a typed name. */
interface UserHit {
  id: number;
  name: string;
  userRef: string;
  rating: number;
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
  const [userResults, setUserResults] = useState<UserHit[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserHit | null>(null);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newVisibility, setNewVisibility] = useState<'public' | 'private'>('public');
  const [newAward, setNewAward] = useState('top-doer');
  /** An AI-suggested award that isn't one of the six presets. */
  const [customAward, setCustomAward] = useState<{ slug: string; label: string; icon: string } | null>(null);
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
    if (!selectedUser || !userAchievements.trim()) {
      showToast('⚠️ Pick the person and describe their achievements', 'error');
      return;
    }

    setGeneratingReason(true);

    const prompt = `You are an expert at writing inspiring award recognition messages. Based on this user's achievements, write a compelling reason/description for the "${newAward}" award.

User: ${selectedUser.name}
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

  /**
   * Awards used to be saved to localStorage against a typed-in name. Nobody
   * was notified, nothing appeared on MyKampung's Hall of Stars — which has
   * shown "No recognitions yet" since it was built — and there was no account
   * behind the name to attach the award to.
   */
  const authHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('token')}`,
  });

  const loadRecognitions = async () => {
    try {
      const res = await fetch(`${API_URL}/api/marcom/recognitions`, { headers: authHeaders() });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setRecognitions(json.data || []);
    } catch (err) {
      console.error('Could not load recognitions:', err);
      showToast('Could not load recognition history', 'error');
    }
  };

  useEffect(() => { loadRecognitions(); }, []);

  // Debounced so typing a name is not one request per keystroke.
  useEffect(() => {
    if (selectedUser || newUserName.trim().length < 2) {
      setUserResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `${API_URL}/api/marcom/users/search?q=${encodeURIComponent(newUserName.trim())}`,
          { headers: authHeaders() }
        );
        if (res.ok) {
          const json = await res.json();
          setUserResults(json.data || []);
        }
      } catch (err) {
        console.error('User search failed:', err);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [newUserName, selectedUser]);

  const AWARD_LABELS: Record<string, { label: string; icon: string }> = {
    'top-doer': { label: 'Top Doer', icon: '🏆' },
    'community-hero': { label: 'Community Hero', icon: '⭐' },
    reliable: { label: 'Reliable Partner', icon: '✓' },
    helpful: { label: 'Most Helpful', icon: '❤️' },
    excellence: { label: 'Excellence Award', icon: '💎' },
    mvp: { label: 'MVP', icon: '🌟' },
  };

  const handleCreateRecognition = async () => {
    if (!selectedUser) {
      showToast('⚠️ Search for and pick the person being recognised', 'error');
      return;
    }
    if (!newReason.trim()) {
      showToast('⚠️ Please give a reason', 'error');
      return;
    }

    const meta = AWARD_LABELS[newAward]
      || (customAward?.slug === newAward
        ? { label: customAward.label, icon: customAward.icon }
        : { label: newAward, icon: '🏅' });
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/marcom/recognitions`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          userId: selectedUser.id,
          award: meta.label,
          reason: newReason,
          icon: meta.icon,
          visibility: newVisibility,
          awardImageUrl: awardImageUrl || null,
          awardImageAlt: awardImageAlt || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);

      await loadRecognitions();
      setNewUserName('');
      setSelectedUser(null);
      setNewReason('');
      setAwardImageUrl('');
      setAwardImageAlt('');
      showToast(
        newVisibility === 'public'
          ? `✅ ${selectedUser.name} notified — the award is now on the Hall of Stars`
          : `✅ ${selectedUser.name} notified privately`,
        'success'
      );
    } catch (err: any) {
      showToast(err.message || 'Could not award that recognition', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleVisibility = async (rec: Recognition) => {
    const next = rec.visibility === 'public' ? 'private' : 'public';
    try {
      const res = await fetch(`${API_URL}/api/marcom/recognitions/${rec.id}`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ visibility: next }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      await loadRecognitions();
      showToast(next === 'public' ? '✅ Now on the Hall of Stars' : '✅ Hidden from the Hall of Stars', 'success');
    } catch (err: any) {
      showToast(err.message || 'Could not change visibility', 'error');
    }
  };

  const handleDeleteRecognition = async (rec: Recognition) => {
    if (!window.confirm(`Remove the "${rec.award}" award from ${rec.userName}?`)) return;
    try {
      const res = await fetch(`${API_URL}/api/marcom/recognitions/${rec.id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      await loadRecognitions();
      showToast('🗑️ Recognition removed', 'success');
    } catch (err: any) {
      showToast(err.message || 'Could not remove that recognition', 'error');
    }
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
          {/*
            A picker, not a text box. The award has to point at an account or
            there is nobody to notify and nothing for MyKampung to render.
          */}
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder="Search by name, alias or user ID…"
              value={selectedUser ? `${selectedUser.name} (${selectedUser.userRef || `#${selectedUser.id}`})` : newUserName}
              onChange={(e) => {
                setSelectedUser(null);
                setNewUserName(e.target.value);
              }}
              style={{
                padding: '10px 12px',
                border: `2px solid ${selectedUser ? '#4CAF50' : '#FFD9B3'}`,
                borderRadius: '6px',
                fontSize: '14px',
                width: '100%',
              }}
            />
            {selectedUser && (
              <button
                onClick={() => { setSelectedUser(null); setNewUserName(''); }}
                style={{ position: 'absolute', right: '8px', top: '8px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', color: '#999' }}
                title="Choose someone else"
              >
                ×
              </button>
            )}
            {!selectedUser && userResults.length > 0 && (
              <div style={{ position: 'absolute', zIndex: 10, left: 0, right: 0, background: 'white', border: '2px solid #FFD9B3', borderRadius: '6px', marginTop: '4px', maxHeight: '220px', overflowY: 'auto' }}>
                {userResults.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => { setSelectedUser(u); setUserResults([]); }}
                    style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px', background: 'none', border: 'none', borderBottom: '1px solid #f5f5f5', cursor: 'pointer', fontSize: '13px' }}
                  >
                    <strong>{u.name || '(no name)'}</strong>
                    <span style={{ color: '#999' }}> {u.userRef || `#${u.id}`}</span>
                    {u.rating > 0 && <span style={{ color: '#FF6B35' }}> · ⭐ {u.rating.toFixed(1)}</span>}
                  </button>
                ))}
              </div>
            )}
            {!selectedUser && searching && (
              <div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>Searching…</div>
            )}
            {!selectedUser && !searching && newUserName.trim().length >= 2 && userResults.length === 0 && (
              <div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>No matching account</div>
            )}
          </div>
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
            {customAward && (
              <option value={customAward.slug}>{customAward.icon} {customAward.label}</option>
            )}
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
              disabled={generatingReason || !selectedUser || !userAchievements.trim()}
              style={{
                width: '100%',
                padding: '8px',
                background: generatingReason || !selectedUser || !userAchievements.trim() ? '#ccc' : '#FF6B35',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontWeight: '600',
                cursor: (generatingReason || !selectedUser || !userAchievements.trim()) ? 'not-allowed' : 'pointer',
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

          <select
            value={newVisibility}
            onChange={(e) => setNewVisibility(e.target.value as 'public' | 'private')}
            style={{ padding: '10px 12px', border: '2px solid #FFD9B3', borderRadius: '6px', fontSize: '14px', cursor: 'pointer' }}
          >
            <option value="public">🌟 Public — shown on MyKampung's Hall of Stars</option>
            <option value="private">🔒 Private — only the recipient is told</option>
          </select>

          <button
            onClick={handleCreateRecognition}
            disabled={saving || !selectedUser}
            style={{
              padding: '10px',
              background: saving || !selectedUser ? '#ccc' : 'linear-gradient(135deg, #FF6B35 0%, #FF8C5A 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontWeight: '600',
              cursor: saving || !selectedUser ? 'not-allowed' : 'pointer',
            }}
          >
            {saving ? 'Awarding…' : '+ Award Recognition'}
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
                          // Keep whoever is already selected — the old handler
                          // cleared the name field, which now means clearing
                          // the chosen account.
                          const slug = award.name.toLowerCase().replace(/ /g, '-');
                          setCustomAward({ slug, label: award.name, icon: award.icon || '🏅' });
                          setNewAward(slug);
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
                    {rec.userRef && ` · ${rec.userRef}`}
                    {rec.visibility === 'public' && ` · 👏 ${rec.votes}`}
                  </div>
                </div>
                <div style={{ display: 'grid', gap: '6px', height: 'fit-content' }}>
                  <span style={{
                    padding: '6px 10px',
                    background: rec.visibility === 'public' ? '#e8f5e9' : '#f5f5f5',
                    color: rec.visibility === 'public' ? '#2e7d32' : '#999',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: '600',
                    textAlign: 'center',
                    whiteSpace: 'nowrap',
                  }}>
                    {rec.visibility.toUpperCase()}
                  </span>
                  <button
                    onClick={() => handleToggleVisibility(rec)}
                    style={{ padding: '4px 10px', background: '#2196F3', color: 'white', border: 'none', borderRadius: '4px', fontSize: '11px', fontWeight: '600', cursor: 'pointer' }}
                  >
                    {rec.visibility === 'public' ? 'Hide' : 'Publish'}
                  </button>
                  <button
                    onClick={() => handleDeleteRecognition(rec)}
                    style={{ padding: '4px 10px', background: '#F44336', color: 'white', border: 'none', borderRadius: '4px', fontSize: '11px', fontWeight: '600', cursor: 'pointer' }}
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      </div>
    </AdminLayout>
  );
}
