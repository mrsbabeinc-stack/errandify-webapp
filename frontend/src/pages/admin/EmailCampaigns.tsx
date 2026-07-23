import React, { useState, useEffect } from 'react';
import { generateText, generateImages } from '../../utils/aiClient';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/admin/AdminLayout';
import ScheduleCalendar from '../../components/ScheduleCalendar';
import { campaignNotificationService } from '../../utils/campaignNotificationService';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface Campaign {
  id: number;
  name: string;
  subject: string;
  content: string;
  recipientCount: number;
  status: 'draft' | 'scheduled' | 'sent' | 'failed';
  createdAt: string;
  sentAt?: string;
  /** Counted from delivery records, not stored — see /api/marcom/campaigns. */
  openRate: number;
  clickRate: number;
  delivered: number;
  sentCount: number;
  errorCount: number;
  errorLog?: string | null;
  recipientSegment: 'all-users' | 'doers' | 'askers' | 'new-users' | 'vip';
  scheduledAt?: string;
  templateType: 'promotional' | 'announcement' | 'reminder' | 'transactional';
  fromName: string;
  fromEmail: string;
  imageUrl?: string;
  imageAlt?: string;
}

interface Segment {
  key: string;
  label: string;
  audience: number;
  reachable: number;
  withEmail: number;
}

export default function EmailCampaigns() {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [activeTab, setActiveTab] = useState<'campaigns' | 'ai-assist' | 'schedule'>('campaigns');

  // Campaign form state
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [fromName, setFromName] = useState('Errandify');
  const [fromEmail, setFromEmail] = useState('noreply@errandify.com');
  const [segment, setSegment] = useState('all-users');
  const [template, setTemplate] = useState('promotional');
  const [scheduledDate, setScheduledDate] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imageAlt, setImageAlt] = useState('');

  // Edit state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editSubject, setEditSubject] = useState('');
  const [editContent, setEditContent] = useState('');

  // Audience + delivery reality, both read from the server
  const [segments, setSegments] = useState<Segment[]>([]);
  const [deliveryMode, setDeliveryMode] = useState<'delivered' | 'logged-only'>('logged-only');
  const [busyId, setBusyId] = useState<number | 'create' | null>(null);

  // AI state
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [campaignObjective, setCampaignObjective] = useState('');
  const [plannerLoading, setPlannerLoading] = useState(false);
  const [imagePrompt, setImagePrompt] = useState('');
  const [imageLoading, setImageLoading] = useState(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState('');
  // Several variants so the admin can pick, rather than accepting the first
  const [imageOptions, setImageOptions] = useState<string[]>([]);

  /**
   * Campaigns used to live in localStorage, so one written on this laptop did
   * not exist on any other and no campaign has ever been sent to anyone.
   */
  const authHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('token')}`,
  });

  const loadCampaigns = async () => {
    try {
      const res = await fetch(`${API_URL}/api/marcom/campaigns`, { headers: authHeaders() });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setCampaigns(json.data || []);
      setDeliveryMode(json.deliveryMode || 'logged-only');
    } catch (err) {
      console.error('Could not load campaigns:', err);
      alert('Could not load campaigns. Check that you are still signed in.');
    }
  };

  /**
   * Audience sizes for the currently selected template type. Promotional mail
   * is filtered to people who opted in, so the number moves when the template
   * changes — that is the consent rule showing its work, not a glitch.
   */
  const loadSegments = async (templateType: string) => {
    try {
      const res = await fetch(
        `${API_URL}/api/marcom/segments?kind=${encodeURIComponent(templateType)}`,
        { headers: authHeaders() }
      );
      if (!res.ok) return;
      const json = await res.json();
      setSegments(json.data || []);
    } catch (err) {
      console.error('Could not load audience sizes:', err);
    }
  };

  useEffect(() => { loadCampaigns(); }, []);
  useEffect(() => { loadSegments(template); }, [template]);

  const selectedSegment = segments.find((s) => s.key === segment);

  const handleCreateCampaign = async () => {
    if (!name.trim() || !subject.trim() || !content.trim()) {
      alert('Please fill in campaign name, subject, and content');
      return;
    }
    setBusyId('create');
    try {
      const res = await fetch(`${API_URL}/api/marcom/campaigns`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          name, subject, content, fromName, fromEmail,
          recipientSegment: segment, templateType: template,
          imageUrl: imageUrl || null, imageAlt: imageAlt || null,
          scheduledAt: scheduledDate || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);

      campaignNotificationService.showCampaignCreatedToast();
      await loadCampaigns();

      setName('');
      setSubject('');
      setContent('');
      setFromName('Errandify');
      setFromEmail('noreply@errandify.com');
      setSegment('all-users');
      setTemplate('promotional');
      setScheduledDate('');
      setImageUrl('');
      setImageAlt('');

      const a = json.audience;
      alert(
        `✅ Campaign saved as ${scheduledDate ? 'scheduled' : 'a draft'}.\n\n` +
        `It will go to ${a.withEmail} of ${a.audience} people in that audience.` +
        (a.reachable < a.audience
          ? `\n\n${a.audience - a.reachable} are excluded because they have not opted in to marketing email.`
          : '')
      );
    } catch (err: any) {
      alert(err.message || 'Could not create that campaign');
    } finally {
      setBusyId(null);
    }
  };

  const handleEditCampaign = (campaign: Campaign) => {
    setEditingId(campaign.id);
    setEditName(campaign.name);
    setEditSubject(campaign.subject);
    setEditContent(campaign.content);
  };

  const handleSaveEdit = async (campaignId: number) => {
    if (!editName.trim() || !editSubject.trim() || !editContent.trim()) {
      alert('Please fill in all fields');
      return;
    }
    setBusyId(campaignId);
    try {
      const res = await fetch(`${API_URL}/api/marcom/campaigns/${campaignId}`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ name: editName, subject: editSubject, content: editContent }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      setEditingId(null);
      await loadCampaigns();
    } catch (err: any) {
      alert(err.message || 'Could not update that campaign');
    } finally {
      setBusyId(null);
    }
  };

  const handleDeleteCampaign = async (campaignId: number) => {
    if (!window.confirm('Delete this campaign?')) return;
    setBusyId(campaignId);
    try {
      const res = await fetch(`${API_URL}/api/marcom/campaigns/${campaignId}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      campaignNotificationService.showCampaignDeletedToast();
      await loadCampaigns();
    } catch (err: any) {
      alert(err.message || 'Could not delete that campaign');
    } finally {
      setBusyId(null);
    }
  };

  /**
   * Sending is the one action here with no undo, so it confirms with the
   * audience size first and the server refuses a second attempt.
   */
  const handleSendCampaign = async (campaign: Campaign) => {
    const seg = segments.find((s) => s.key === campaign.recipientSegment);
    const to = seg ? `${seg.withEmail} recipient(s)` : 'this campaign’s audience';
    const warning = deliveryMode === 'logged-only'
      ? '\n\nNote: no email provider is configured, so messages will be logged by the server rather than delivered.'
      : '\n\nThis cannot be undone.';
    if (!window.confirm(`Send "${campaign.name}" to ${to}?${warning}`)) return;

    setBusyId(campaign.id);
    try {
      const res = await fetch(`${API_URL}/api/marcom/campaigns/${campaign.id}/send`, {
        method: 'POST',
        headers: authHeaders(),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);

      // campaignNotificationService.notifyCampaignSent is deliberately not
      // called: it POSTs to /api/notifications/campaign-sent, which does not
      // exist. The send route already records the outcome server-side.
      const d = json.data;
      await loadCampaigns();
      alert(
        `${d.sent} of ${d.attempted} messages ${json.deliveryMode === 'delivered' ? 'sent' : 'logged'}` +
        (d.failed > 0 ? `\n${d.failed} failed — see the campaign’s error log.` : '') +
        (json.deliveryMode === 'logged-only'
          ? '\n\nNo email provider is configured, so nothing left the server.'
          : '')
      );
    } catch (err: any) {
      alert(err.message || 'Could not send that campaign');
    } finally {
      setBusyId(null);
    }
  };

  /**
   * Was a direct browser fetch to dashscope with a hardcoded 'Bearer sk-demo'
   * placeholder — so it never actually worked, it just failed quietly and
   * returned null. Now goes through the backend, which holds the real key.
   */
  const callQwenAPI = async (prompt: string): Promise<string | null> => {
    try {
      return await generateText(prompt, { maxTokens: 1000, temperature: 0.7 });
    } catch (error) {
      console.error('AI generation failed:', error);
      return null;
    }
  };

  const handleGenerateCampaignPlan = async () => {
    if (!campaignObjective.trim()) {
      alert('Please enter your campaign objective');
      return;
    }

    setPlannerLoading(true);
    try {
      const prompt = `You are a marketing expert for Errandify, a warm community-focused platform.

Campaign Objective: ${campaignObjective}

Generate a complete email campaign plan in JSON format (ONLY JSON, no markdown):

{
  "name": "Campaign name",
  "subject": "Email subject line",
  "content": "Email body content",
  "imagePrompt": "Detailed image description for Qwen to generate",
  "template": "promotional|announcement|reminder|transactional"
}

Make content warm, engaging, community-focused. Keep subject under 60 characters.`;

      const result = await callQwenAPI(prompt);

      if (result) {
        try {
          const plan = JSON.parse(result);
          setName(plan.name);
          setSubject(plan.subject);
          setContent(plan.content);
          setTemplate(plan.template);
          setImagePrompt(plan.imagePrompt);
          alert('✅ Campaign plan generated! Image prompt ready for generation.');
        } catch (e) {
          alert('Generated response, but parsing failed. Try again.');
        }
      } else {
        alert('Qwen API unavailable. Try again or create manually.');
      }
    } catch (error) {
      alert('Error generating campaign plan');
    } finally {
      setPlannerLoading(false);
    }
  };

  /**
   * Real image generation, replacing a handler that asked a TEXT model to
   * "return only the image URL" and then fell back to one hardcoded Unsplash
   * photo — which is why every campaign banner was the same picture.
   *
   * The old code also had a dangerous branch: if the model's reply happened to
   * contain "http", it used that as the banner. A hallucinated URL would have
   * gone straight into a live campaign.
   */
  const handleGenerateImage = async () => {
    if (!imagePrompt.trim()) {
      alert('Describe the image you want first, or use the Campaign Planner.');
      return;
    }

    setImageLoading(true);
    try {
      const images = await generateImages(
        `Email banner for Errandify, a warm Singapore neighbourhood errand marketplace. ${imagePrompt}. Friendly community atmosphere, suitable for email, no text overlay.`,
        3,
        '1024*1024'
      );
      setImageOptions(images.map((i) => i.url));
      // Preselect the first so the campaign is usable immediately
      setGeneratedImageUrl(images[0].url);
      setImageUrl(images[0].url);
      setImageAlt(imagePrompt);
    } catch (err: any) {
      alert(err.message || 'Could not generate images.');
    } finally {
      setImageLoading(false);
    }
  };


  const statusColors: any = {
    'draft': '#2196F3',
    'scheduled': '#FF9800',
    'sent': '#4CAF50',
    'failed': '#F44336',
  };

  return (
    <AdminLayout>
      <div style={{ padding: '16px', background: '#fff' }}>
        <div style={{ marginBottom: '20px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#333' }}>📧 Email Campaigns</h2>
          <p style={{ fontSize: '14px', color: '#666' }}>Create and manage email campaigns</p>
          {/*
            Said plainly rather than discovered after a send: services/email.ts
            logs and returns success when no provider is configured, so a
            "Sent" badge on that setup means the server wrote it to a log.
          */}
          {deliveryMode === 'logged-only' && (
            <div style={{ marginTop: '10px', padding: '10px 12px', background: '#FFF8E1', border: '1px solid #FFD54F', borderRadius: '6px', fontSize: '13px', color: '#6b5200' }}>
              No email provider is configured on this server. Sending records the campaign and
              writes each message to the server log — nothing reaches an inbox.
            </div>
          )}
        </div>

        {/* TAB NAVIGATION */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', paddingBottom: '12px', borderBottom: '2px solid #f0f0f0' }}>
          <button
            onClick={() => setActiveTab('campaigns')}
            style={{
              padding: '8px 16px',
              background: activeTab === 'campaigns' ? '#FF6B35' : 'transparent',
              color: activeTab === 'campaigns' ? 'white' : '#666',
              border: 'none',
              borderRadius: '6px',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            📧 Campaigns
          </button>
          <button
            onClick={() => setActiveTab('ai-assist')}
            style={{
              padding: '8px 16px',
              background: activeTab === 'ai-assist' ? '#FF6B35' : 'transparent',
              color: activeTab === 'ai-assist' ? 'white' : '#666',
              border: 'none',
              borderRadius: '6px',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            🤖 AI Assist
          </button>
          <button
            onClick={() => setActiveTab('schedule')}
            style={{
              padding: '8px 16px',
              background: activeTab === 'schedule' ? '#FF6B35' : 'transparent',
              color: activeTab === 'schedule' ? 'white' : '#666',
              border: 'none',
              borderRadius: '6px',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            📅 Calendar & Schedule
          </button>
        </div>

        {/* AI ASSIST TAB */}
        {activeTab === 'ai-assist' && (
          <div style={{ display: 'grid', gap: '24px' }}>
            {/* CAMPAIGN PLANNER */}
            <div style={{ padding: '16px', background: '#F0E6FF', borderRadius: '8px', border: '2px solid #D4B5FF' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#333', marginBottom: '12px' }}>
                🚀 AI Campaign Planner (Qwen)
              </h3>
              <p style={{ fontSize: '13px', color: '#666', marginBottom: '12px' }}>
                State your objective and Qwen AI will generate complete campaign (name, subject, content, image prompt)
              </p>
              <div style={{ display: 'grid', gap: '12px' }}>
                <textarea
                  placeholder="E.g., 'Increase referrals among doers' or 'Launch summer promo for new users' or 'Promote premium features to VIP'"
                  value={campaignObjective}
                  onChange={(e) => setCampaignObjective(e.target.value)}
                  rows={3}
                  style={{ padding: '10px 12px', border: '2px solid #D4B5FF', borderRadius: '6px', fontSize: '14px', fontFamily: 'inherit' }}
                />
                <button
                  onClick={handleGenerateCampaignPlan}
                  disabled={plannerLoading}
                  style={{
                    padding: '12px',
                    background: plannerLoading ? '#ccc' : 'linear-gradient(135deg, #A78BFA 0%, #C4B5FD 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontWeight: '600',
                    cursor: plannerLoading ? 'not-allowed' : 'pointer',
                    fontSize: '15px',
                  }}
                >
                  {plannerLoading ? '⏳ Planning with Qwen...' : '🎯 Generate Full Campaign'}
                </button>
                <div style={{ fontSize: '12px', color: '#666', background: 'white', padding: '8px', borderRadius: '4px' }}>
                  ✨ Creates: name, subject, content, image prompt
                </div>
              </div>
            </div>

            {/* IMAGE GENERATOR */}
            <div style={{ padding: '16px', background: '#FFF0E6', borderRadius: '8px', border: '2px solid #FFD9B3' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#333', marginBottom: '12px' }}>
                🖼️ AI Image Generator (Qwen)
              </h3>
              <p style={{ fontSize: '13px', color: '#666', marginBottom: '12px' }}>
                Generate professional email banner images using Qwen
              </p>
              <div style={{ display: 'grid', gap: '12px' }}>
                <textarea
                  placeholder="Describe the image (e.g., 'Neighbors helping each other, warm colors, happy atmosphere')"
                  value={imagePrompt}
                  onChange={(e) => setImagePrompt(e.target.value)}
                  rows={2}
                  style={{ padding: '10px 12px', border: '2px solid #FFD9B3', borderRadius: '6px', fontSize: '14px', fontFamily: 'inherit' }}
                />
                <button
                  onClick={handleGenerateImage}
                  disabled={imageLoading}
                  style={{
                    padding: '12px',
                    background: imageLoading ? '#ccc' : 'linear-gradient(135deg, #FF6B35 0%, #FF8C5A 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontWeight: '600',
                    cursor: imageLoading ? 'not-allowed' : 'pointer',
                    fontSize: '15px',
                  }}
                >
                  {imageLoading ? '⏳ Generating image...' : '🎨 Generate Image'}
                </button>

                {generatedImageUrl && (
                  <div style={{ marginTop: '12px' }}>
                    <img
                      src={generatedImageUrl}
                      alt="Generated campaign image"
                      style={{
                        maxWidth: '100%',
                        height: 'auto',
                        maxHeight: '250px',
                        borderRadius: '6px',
                        marginBottom: '8px',
                      }}
                    />
                    {imageOptions.length > 1 && (
                      <>
                        <div style={{ fontSize: '11px', color: '#666', marginBottom: '6px' }}>
                          Pick the one you like — click to use it.
                        </div>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          {imageOptions.map((url) => (
                            <button
                              key={url}
                              onClick={() => { setGeneratedImageUrl(url); setImageUrl(url); }}
                              style={{
                                padding: 0, lineHeight: 0, cursor: 'pointer', background: 'none',
                                border: generatedImageUrl === url ? '3px solid #FF6B35' : '2px solid #ddd',
                                borderRadius: '6px', overflow: 'hidden',
                              }}
                              title={generatedImageUrl === url ? 'Currently selected' : 'Use this one'}
                            >
                              <img src={url} alt="Option" style={{ width: '92px', display: 'block' }} />
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* CAMPAIGNS TAB */}
        {activeTab === 'campaigns' && (
          <div>
            {/* CREATE CAMPAIGN FORM */}
            <div style={{ marginBottom: '24px', padding: '16px', background: '#FFF8F5', borderRadius: '8px', border: '2px solid #FFD9B3' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#333', marginBottom: '12px' }}>Create New Campaign</h3>
              <div style={{ display: 'grid', gap: '12px' }}>
                <input
                  type="text"
                  placeholder="Campaign name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{ padding: '10px 12px', border: '2px solid #FFD9B3', borderRadius: '6px', fontSize: '14px' }}
                />
                <input
                  type="text"
                  placeholder="Email subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  style={{ padding: '10px 12px', border: '2px solid #FFD9B3', borderRadius: '6px', fontSize: '14px' }}
                />
                <textarea
                  placeholder="Email content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={4}
                  style={{ padding: '10px 12px', border: '2px solid #FFD9B3', borderRadius: '6px', fontSize: '14px', fontFamily: 'inherit' }}
                />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <input
                    type="text"
                    placeholder="From Name"
                    value={fromName}
                    onChange={(e) => setFromName(e.target.value)}
                    style={{ padding: '10px 12px', border: '2px solid #FFD9B3', borderRadius: '6px', fontSize: '14px' }}
                  />
                  <input
                    type="email"
                    placeholder="From Email"
                    value={fromEmail}
                    onChange={(e) => setFromEmail(e.target.value)}
                    style={{ padding: '10px 12px', border: '2px solid #FFD9B3', borderRadius: '6px', fontSize: '14px' }}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                  <select
                    value={segment}
                    onChange={(e) => setSegment(e.target.value)}
                    style={{ padding: '10px 12px', border: '2px solid #FFD9B3', borderRadius: '6px', fontSize: '14px' }}
                  >
                    {segments.length === 0 ? (
                      <option value="all-users">All Users</option>
                    ) : (
                      segments.map((s) => (
                        <option key={s.key} value={s.key}>
                          {s.key === 'all-users' ? 'All Users'
                            : s.key === 'new-users' ? 'New Users'
                            : s.key.charAt(0).toUpperCase() + s.key.slice(1)}
                          {' '}({s.withEmail})
                        </option>
                      ))
                    )}
                  </select>
                  <select
                    value={template}
                    onChange={(e) => setTemplate(e.target.value)}
                    style={{ padding: '10px 12px', border: '2px solid #FFD9B3', borderRadius: '6px', fontSize: '14px' }}
                  >
                    <option value="promotional">Promotional</option>
                    <option value="announcement">Announcement</option>
                    <option value="reminder">Reminder</option>
                    <option value="transactional">Transactional</option>
                  </select>
                  <input
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    style={{ padding: '10px 12px', border: '2px solid #FFD9B3', borderRadius: '6px', fontSize: '14px' }}
                  />
                </div>
                {/*
                  What this campaign would actually reach, before it is saved.
                  The old form showed nothing and stored a flat 1,000.
                */}
                {selectedSegment && (
                  <div style={{ fontSize: '12px', color: '#666', background: '#FFF8F5', padding: '10px', borderRadius: '6px', border: '1px solid #FFD9B3' }}>
                    <strong>{selectedSegment.label}</strong> — {selectedSegment.audience} account(s),
                    {' '}{selectedSegment.withEmail} with an email address.
                    {selectedSegment.reachable < selectedSegment.audience && (
                      <div style={{ marginTop: '6px', color: '#C1440E' }}>
                        {selectedSegment.audience - selectedSegment.reachable} excluded: promotional email
                        goes only to people who have opted in. Choose Announcement, Reminder or
                        Transactional for service messages.
                      </div>
                    )}
                  </div>
                )}
                <button
                  onClick={handleCreateCampaign}
                  disabled={busyId === 'create'}
                  style={{
                    padding: '12px',
                    background: busyId === 'create' ? '#ccc' : 'linear-gradient(135deg, #FF6B35 0%, #FF8C5A 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontWeight: '600',
                    cursor: busyId === 'create' ? 'not-allowed' : 'pointer',
                    fontSize: '16px',
                  }}
                >
                  {busyId === 'create' ? 'Saving…' : '+ Create Campaign'}
                </button>
              </div>
            </div>

            {/* CAMPAIGNS LIST */}
            <div style={{ display: 'grid', gap: '12px' }}>
              {campaigns.map(campaign => (
                <div
                  key={campaign.id}
                  style={{
                    padding: '16px',
                    background: 'white',
                    border: `2px solid ${statusColors[campaign.status]}`,
                    borderRadius: '8px',
                  }}
                >
                  {editingId === campaign.id ? (
                    <div style={{ display: 'grid', gap: '12px' }}>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        style={{ padding: '10px 12px', border: '2px solid #FFD9B3', borderRadius: '6px', fontSize: '14px' }}
                        placeholder="Name"
                      />
                      <input
                        type="text"
                        value={editSubject}
                        onChange={(e) => setEditSubject(e.target.value)}
                        style={{ padding: '10px 12px', border: '2px solid #FFD9B3', borderRadius: '6px', fontSize: '14px' }}
                        placeholder="Subject"
                      />
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        rows={3}
                        style={{ padding: '10px 12px', border: '2px solid #FFD9B3', borderRadius: '6px', fontSize: '14px', fontFamily: 'inherit' }}
                        placeholder="Content"
                      />
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <button
                          onClick={() => handleSaveEdit(campaign.id)}
                          style={{ padding: '10px', background: '#4CAF50', color: 'white', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer' }}
                        >
                          ✅ Save
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          style={{ padding: '10px', background: '#f0f0f0', color: '#333', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer' }}
                        >
                          ❌ Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '12px', alignItems: 'start', marginBottom: '12px' }}>
                        <div>
                          <div style={{ fontWeight: '600', color: '#333', marginBottom: '4px' }}>{campaign.name}</div>
                          <div style={{ fontSize: '11px', color: '#999', marginBottom: '4px' }}>
                            📧 {campaign.fromName} &lt;{campaign.fromEmail}&gt;
                          </div>
                          <div style={{ fontSize: '12px', color: '#666' }}>Subject: "{campaign.subject}"</div>
                        </div>
                        <span
                          style={{
                            padding: '6px 10px',
                            background: statusColors[campaign.status],
                            color: 'white',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: '600',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {campaign.status.toUpperCase()}
                        </span>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '12px', marginBottom: '12px', fontSize: '12px' }}>
                        <div style={{ background: '#FFF8F5', padding: '8px', borderRadius: '4px' }}>
                          <div style={{ fontSize: '10px', color: '#999' }}>Recipients</div>
                          <div style={{ fontWeight: '700', color: '#FF6B35', fontSize: '14px' }}>{campaign.recipientCount.toLocaleString()}</div>
                        </div>
                        <div style={{ background: '#FFF8F5', padding: '8px', borderRadius: '4px' }}>
                          <div style={{ fontSize: '10px', color: '#999' }}>Template</div>
                          <div style={{ fontWeight: '700', color: '#FF6B35', fontSize: '13px', textTransform: 'capitalize' }}>{campaign.templateType}</div>
                        </div>
                        <div style={{ background: '#FFF8F5', padding: '8px', borderRadius: '4px' }}>
                          <div style={{ fontSize: '10px', color: '#999' }}>Open Rate</div>
                          <div style={{ fontWeight: '700', color: '#FF6B35', fontSize: '14px' }}>{campaign.openRate}%</div>
                        </div>
                        <div style={{ background: '#FFF8F5', padding: '8px', borderRadius: '4px' }}>
                          <div style={{ fontSize: '10px', color: '#999' }}>Click Rate</div>
                          <div style={{ fontWeight: '700', color: '#FF6B35', fontSize: '14px' }}>{campaign.clickRate}%</div>
                        </div>
                      </div>

                      {campaign.status === 'sent' && (
                        <div style={{ fontSize: '11px', color: '#666', marginBottom: '8px' }}>
                          Sent {campaign.sentAt ? new Date(campaign.sentAt).toLocaleString() : ''} —
                          {' '}{campaign.sentCount} delivered
                          {campaign.errorCount > 0 && `, ${campaign.errorCount} failed`}
                        </div>
                      )}
                      {campaign.errorLog && (
                        <pre style={{ fontSize: '11px', color: '#C1440E', background: '#FFF3F0', padding: '8px', borderRadius: '4px', marginBottom: '8px', whiteSpace: 'pre-wrap' }}>
                          {campaign.errorLog}
                        </pre>
                      )}

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                        <button
                          onClick={() => handleSendCampaign(campaign)}
                          disabled={campaign.status === 'sent' || busyId === campaign.id}
                          title={campaign.status === 'sent' ? 'Already sent' : 'Send to this audience now'}
                          style={{
                            padding: '8px',
                            background: campaign.status === 'sent' ? '#ccc' : '#4CAF50',
                            color: 'white', border: 'none', borderRadius: '6px', fontWeight: '600',
                            cursor: campaign.status === 'sent' ? 'not-allowed' : 'pointer', fontSize: '12px',
                          }}
                        >
                          {campaign.status === 'sent' ? '✓ Sent' : busyId === campaign.id ? 'Sending…' : '📤 Send now'}
                        </button>
                        <button
                          onClick={() => handleEditCampaign(campaign)}
                          disabled={campaign.status === 'sent'}
                          title={campaign.status === 'sent' ? 'A sent campaign is a record of what people received' : 'Edit'}
                          style={{ padding: '8px', background: campaign.status === 'sent' ? '#ccc' : '#2196F3', color: 'white', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: campaign.status === 'sent' ? 'not-allowed' : 'pointer', fontSize: '12px' }}
                        >
                          ✏️ Edit
                        </button>
                        <button
                          onClick={() => handleDeleteCampaign(campaign.id)}
                          style={{ padding: '8px', background: '#F44336', color: 'white', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer', fontSize: '12px' }}
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SCHEDULE & CALENDAR TAB */}
        {activeTab === 'schedule' && (
          <div style={{ display: 'grid', gap: '24px' }}>
            <ScheduleCalendar
              contentType="email"
              targetAudience={segment || 'all-users'}
              contentTopic={name || 'Email Campaign'}
              onScheduleSelect={(date, time) => {
                setScheduledDate(date);
                setActiveTab('campaigns');
                alert(`✅ Schedule set for ${new Date(`${date}T${time}`).toLocaleString()}`);
              }}
            />

            {/* CAMPAIGN HISTORY & REMINDERS */}
            <div style={{ padding: '16px', background: '#FFF8F5', borderRadius: '8px', border: '2px solid #FFD9B3' }}>
              <div style={{ fontSize: '16px', fontWeight: '700', color: '#333', marginBottom: '16px' }}>
                📋 Campaign History & Reminders
              </div>

              <div style={{ display: 'grid', gap: '12px' }}>
                {campaigns.length === 0 ? (
                  <div style={{ padding: '24px', textAlign: 'center', color: '#999' }}>
                    No campaigns yet. Create one to see history and set reminders.
                  </div>
                ) : (
                  campaigns.map(campaign => (
                    <div
                      key={campaign.id}
                      style={{
                        padding: '12px',
                        background: 'white',
                        borderRadius: '6px',
                        border: '1px solid #FFD9B3',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                        <div>
                          <div style={{ fontSize: '14px', fontWeight: '600', color: '#333', marginBottom: '4px' }}>
                            {campaign.name}
                          </div>
                          <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>
                            Subject: "{campaign.subject}"
                          </div>
                        </div>
                        <span
                          style={{
                            padding: '4px 8px',
                            background: statusColors[campaign.status],
                            color: 'white',
                            borderRadius: '4px',
                            fontSize: '10px',
                            fontWeight: '600',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {campaign.status.toUpperCase()}
                        </span>
                      </div>

                      <div style={{ fontSize: '11px', color: '#999', marginBottom: '8px' }}>
                        📅 Created: {new Date(campaign.createdAt).toLocaleString()}
                        {campaign.scheduledAt && (
                          <>
                            <br />
                            ⏰ Scheduled: {new Date(campaign.scheduledAt).toLocaleString()}
                          </>
                        )}
                        {campaign.sentAt && (
                          <>
                            <br />
                            📤 Sent: {new Date(campaign.sentAt).toLocaleString()}
                          </>
                        )}
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', fontSize: '11px' }}>
                        <div style={{ background: '#FFF8F5', padding: '6px', borderRadius: '4px' }}>
                          👥 {campaign.recipientCount.toLocaleString()}
                        </div>
                        <div style={{ background: '#FFF8F5', padding: '6px', borderRadius: '4px' }}>
                          📧 {campaign.templateType}
                        </div>
                        <div style={{ background: '#FFF8F5', padding: '6px', borderRadius: '4px' }}>
                          👁️ {campaign.openRate}% open
                        </div>
                        <div style={{ background: '#FFF8F5', padding: '6px', borderRadius: '4px' }}>
                          🔗 {campaign.clickRate}% click
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* REMINDER SETTINGS */}
              <div style={{ marginTop: '24px', padding: '12px', background: '#F5F5F5', borderRadius: '6px' }}>
                <div style={{ fontSize: '13px', fontWeight: '600', color: '#333', marginBottom: '8px' }}>
                  🔔 Reminder Settings
                </div>
                <div style={{ fontSize: '12px', color: '#666', lineHeight: '1.6' }}>
                  <div style={{ marginBottom: '8px' }}>
                    ✓ Get notified 1 week before campaign send
                  </div>
                  <div style={{ marginBottom: '8px' }}>
                    ✓ Get notified 2 days before campaign send
                  </div>
                  <div style={{ marginBottom: '8px' }}>
                    ✓ Get notified 1 day before campaign send
                  </div>
                  <div>
                    ✓ Get notified 2 hours before campaign send
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
