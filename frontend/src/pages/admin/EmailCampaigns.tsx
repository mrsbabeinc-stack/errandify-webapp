import React, { useState, useEffect } from 'react';
import { generateText, generateImages } from '../../utils/aiClient';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/admin/AdminLayout';
import ScheduleCalendar from '../../components/ScheduleCalendar';
import { campaignNotificationService } from '../../utils/campaignNotificationService';

interface Campaign {
  id: string;
  name: string;
  subject: string;
  content: string;
  recipientCount: number;
  status: 'draft' | 'scheduled' | 'sent' | 'failed';
  createdAt: string;
  sentAt?: string;
  openRate: number;
  clickRate: number;
  recipientSegment: 'all-users' | 'doers' | 'askers' | 'vip';
  scheduledDate?: string;
  scheduledTime?: string;
  frequency?: 'weekly' | 'biweekly' | 'monthly';
  engagementScore?: number;
  templateType: 'promotional' | 'announcement' | 'reminder' | 'transactional';
  fromName: string;
  fromEmail: string;
  imageUrl?: string;
  imageAlt?: string;
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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editSubject, setEditSubject] = useState('');
  const [editContent, setEditContent] = useState('');

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

  useEffect(() => {
    const saved = localStorage.getItem('emailCampaigns');
    if (saved) {
      setCampaigns(JSON.parse(saved));
    } else {
      const demoCampaigns: Campaign[] = [
        {
          id: 'c_1',
          name: 'Welcome New Users',
          subject: 'Welcome to Errandify!',
          content: 'Hi! Welcome to our community.',
          recipientCount: 2345,
          status: 'sent',
          createdAt: new Date(Date.now() - 604800000).toISOString(),
          sentAt: new Date(Date.now() - 604800000).toISOString(),
          openRate: 42,
          clickRate: 18,
          recipientSegment: 'all-users',
          templateType: 'promotional',
          fromName: 'Errandify',
          fromEmail: 'noreply@errandify.com',
        },
      ];
      setCampaigns(demoCampaigns);
      localStorage.setItem('emailCampaigns', JSON.stringify(demoCampaigns));
    }
  }, []);

  const handleCreateCampaign = () => {
    if (!name.trim() || !subject.trim() || !content.trim()) {
      alert('Please fill in campaign name, subject, and content');
      return;
    }

    const newCampaign: Campaign = {
      id: `c_${Date.now()}`,
      name,
      subject,
      content,
      recipientCount: 1000,
      status: scheduledDate ? 'scheduled' : 'draft',
      createdAt: new Date().toISOString(),
      scheduledDate: scheduledDate || undefined,
      openRate: 0,
      clickRate: 0,
      recipientSegment: segment as any,
      templateType: template as any,
      fromName,
      fromEmail,
      imageUrl,
      imageAlt,
    };

    const updated = [...campaigns, newCampaign];
    setCampaigns(updated);
    localStorage.setItem('emailCampaigns', JSON.stringify(updated));

    // Send notifications
    campaignNotificationService.showCampaignCreatedToast();

    const token = localStorage.getItem('token') || '';
    if (token) {
      campaignNotificationService.notifyCampaignCreated(newCampaign, token);
      if (scheduledDate) {
        campaignNotificationService.notifyScheduledCampaign(newCampaign, token);
      }
    }

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

    alert('✅ Campaign created! Notifications sent.');
  };

  const handleEditCampaign = (campaign: Campaign) => {
    setEditingId(campaign.id);
    setEditName(campaign.name);
    setEditSubject(campaign.subject);
    setEditContent(campaign.content);
  };

  const handleSaveEdit = (campaignId: string) => {
    if (!editName.trim() || !editSubject.trim() || !editContent.trim()) {
      alert('Please fill in all fields');
      return;
    }

    const updated = campaigns.map(c =>
      c.id === campaignId
        ? { ...c, name: editName, subject: editSubject, content: editContent }
        : c
    );
    setCampaigns(updated);
    localStorage.setItem('emailCampaigns', JSON.stringify(updated));
    setEditingId(null);
    alert('✅ Campaign updated!');
  };

  const handleDeleteCampaign = (campaignId: string) => {
    if (!window.confirm('Delete this campaign?')) return;
    const updated = campaigns.filter(c => c.id !== campaignId);
    setCampaigns(updated);
    localStorage.setItem('emailCampaigns', JSON.stringify(updated));

    campaignNotificationService.showCampaignDeletedToast();
    alert('✅ Campaign deleted!');
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
                    <option value="all-users">All Users</option>
                    <option value="doers">Doers</option>
                    <option value="askers">Askers</option>
                    <option value="vip">VIP</option>
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
                <button
                  onClick={handleCreateCampaign}
                  style={{
                    padding: '12px',
                    background: 'linear-gradient(135deg, #FF6B35 0%, #FF8C5A 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    fontSize: '16px',
                  }}
                >
                  + Create Campaign
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

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <button
                          onClick={() => handleEditCampaign(campaign)}
                          style={{ padding: '8px', background: '#2196F3', color: 'white', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer', fontSize: '12px' }}
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
                        {campaign.scheduledDate && (
                          <>
                            <br />
                            ⏰ Scheduled: {new Date(`${campaign.scheduledDate}T${campaign.scheduledTime || '09:00'}`).toLocaleString()}
                            {campaign.frequency && ` • Frequency: ${campaign.frequency}`}
                            {campaign.engagementScore && ` • Expected: ${campaign.engagementScore}%`}
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
